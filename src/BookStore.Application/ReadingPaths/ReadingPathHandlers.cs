using BookStore.Application.Abstractions;
using BookStore.Application.Abstractions.Auditing;
using BookStore.Application.Abstractions.Messaging;
using BookStore.Application.Abstractions.Repositories;
using BookStore.Application.Common;
using BookStore.Application.Library;
using BookStore.Domain.Books;
using BookStore.Domain.ReadingPaths;
using FluentValidation;

namespace BookStore.Application.ReadingPaths;

// ---------- Public ----------

public sealed record GetReadingPathsQuery(bool FeaturedOnly) : IQuery<IReadOnlyList<ReadingPathSummaryDto>>;

public sealed class GetReadingPathsQueryHandler(IReadingPathRepository repository, ReadingPathAssembler assembler)
    : IQueryHandler<GetReadingPathsQuery, IReadOnlyList<ReadingPathSummaryDto>>
{
    public async Task<Result<IReadOnlyList<ReadingPathSummaryDto>>> Handle(GetReadingPathsQuery query, CancellationToken ct)
    {
        var paths = (await repository.ListAsync(includeInactive: false, ct))
            .Where(p => !query.FeaturedOnly || p.IsFeatured)
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Title, StringComparer.Ordinal)
            .ToList();

        return Result.Success(await assembler.SummariesAsync(paths, ct));
    }
}

/// Optional CustomerId: with it, the page shows owned books, progress and
/// the remaining price.
public sealed record GetReadingPathBySlugQuery(string Slug, int? CustomerId) : IQuery<ReadingPathDto>;

public sealed class GetReadingPathBySlugQueryHandler(
    IReadingPathRepository repository,
    ReadingPathAssembler assembler,
    PathViewerLoader viewerLoader)
    : IQueryHandler<GetReadingPathBySlugQuery, ReadingPathDto>
{
    public async Task<Result<ReadingPathDto>> Handle(GetReadingPathBySlugQuery query, CancellationToken ct)
    {
        ReadingPath? path;
        try { path = await repository.GetBySlugAsync(query.Slug, ct); }
        catch (ArgumentException) { path = null; }

        if (path is null || !path.IsActive)
            return Result.Failure<ReadingPathDto>(ReadingPathErrors.SlugNotFound(query.Slug));

        var viewer = query.CustomerId is { } customerId ? await viewerLoader.LoadAsync(customerId, ct) : null;
        return Result.Success(await assembler.DetailAsync(path, viewer, ct));
    }
}

public sealed class PathViewerLoader(LibraryReader libraryReader, IPathEnrollmentRepository enrollmentRepository)
{
    public async Task<PathViewer> LoadAsync(int customerId, CancellationToken ct)
    {
        var (owned, entries) = await libraryReader.LoadAsync(customerId, ct);
        var enrollments = await enrollmentRepository.ListByCustomerAsync(customerId, ct);

        return new PathViewer(owned, entries.ToDictionary(e => e.BookId), enrollments.ToDictionary(e => e.ReadingPathId));
    }
}

// ---------- Customer: مساراتي ----------

public sealed record GetMyReadingPathsQuery(int CustomerId) : IQuery<IReadOnlyList<MyReadingPathDto>>;

public sealed class GetMyReadingPathsQueryHandler(
    IReadingPathRepository repository, ReadingPathAssembler assembler, PathViewerLoader viewerLoader)
    : IQueryHandler<GetMyReadingPathsQuery, IReadOnlyList<MyReadingPathDto>>
{
    public async Task<Result<IReadOnlyList<MyReadingPathDto>>> Handle(GetMyReadingPathsQuery query, CancellationToken ct)
    {
        var viewer = await viewerLoader.LoadAsync(query.CustomerId, ct);
        if (viewer.EnrollmentsByPath.Count == 0)
            return Result.Success<IReadOnlyList<MyReadingPathDto>>([]);

        var paths = await repository.ListByIdsAsync(viewer.EnrollmentsByPath.Keys.ToList(), ct);
        var result = new List<MyReadingPathDto>();

        // Most recently started first. Hidden paths stay visible to people
        // who already started them: their progress still matters to them.
        foreach (var path in paths.OrderByDescending(p => viewer.EnrollmentsByPath[p.Id].StartedAtUtc))
        {
            var detail = await assembler.DetailAsync(path, viewer, ct);
            result.Add(new MyReadingPathDto(detail.Summary, detail.MyProgress!, detail.Stages.FirstOrDefault(s => s.IsCurrent)));
        }

        return Result.Success<IReadOnlyList<MyReadingPathDto>>(result);
    }
}

public sealed record StartReadingPathCommand(int CustomerId, int ReadingPathId) : ICommand;

public sealed class StartReadingPathCommandHandler(
    IReadingPathRepository repository, IPathEnrollmentRepository enrollmentRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<StartReadingPathCommand>
{
    public async Task<Result> Handle(StartReadingPathCommand command, CancellationToken ct)
    {
        var path = await repository.GetByIdAsync(command.ReadingPathId, ct);
        if (path is null || !path.IsActive)
            return Result.Failure(ReadingPathErrors.NotFound(command.ReadingPathId));

        if (await enrollmentRepository.GetAsync(command.CustomerId, path.Id, ct) is not null)
            return Result.Success(); // idempotent

        enrollmentRepository.Add(PathEnrollment.Create(command.CustomerId, path.Id));
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed record LeaveReadingPathCommand(int CustomerId, int ReadingPathId) : ICommand;

public sealed class LeaveReadingPathCommandHandler(IPathEnrollmentRepository enrollmentRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<LeaveReadingPathCommand>
{
    public async Task<Result> Handle(LeaveReadingPathCommand command, CancellationToken ct)
    {
        var enrollment = await enrollmentRepository.GetAsync(command.CustomerId, command.ReadingPathId, ct);
        if (enrollment is null)
            return Result.Success(); // idempotent

        // Reading progress lives in the library and is NOT lost by leaving.
        enrollmentRepository.Remove(enrollment);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

// ---------- Admin ----------

public sealed record SaveReadingPathCommand(
    int? ReadingPathId, string Title, string? Slug, string? Description, ReaderLevel Level, int EstimatedWeeks,
    int DiscountPercentage, bool IsFeatured, int DisplayOrder, IReadOnlyList<ReadingPathStageInput> Stages)
    : ICommand<AdminReadingPathDto>, IAuditableCommand
{
    public string AuditEntityType => "ReadingPath";
    public string? AuditEntityId => ReadingPathId?.ToString() ?? Slug ?? Title;
}

public sealed class SaveReadingPathCommandValidator : AbstractValidator<SaveReadingPathCommand>
{
    public SaveReadingPathCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(ReadingPath.MaxTitleLength);
        RuleFor(x => x.Slug).MaximumLength(Domain.Books.Slug.MaxLength);
        RuleFor(x => x.Description).MaximumLength(ReadingPath.MaxDescriptionLength);
        RuleFor(x => x.Level).IsInEnum();
        RuleFor(x => x.EstimatedWeeks).InclusiveBetween(1, 520);
        RuleFor(x => x.DiscountPercentage).InclusiveBetween(0, ReadingPath.MaxDiscountPercentage);
        RuleFor(x => x.Stages).NotNull();
        RuleFor(x => x.Stages.Count).InclusiveBetween(ReadingPath.MinStages, ReadingPath.MaxStages);
        RuleForEach(x => x.Stages).ChildRules(stage =>
        {
            stage.RuleFor(s => s.BookId).GreaterThan(0);
            stage.RuleFor(s => s.Reason).NotEmpty().MaximumLength(ReadingPath.MaxReasonLength);
        });
    }
}

/// Create (no id) or full replacement (id). Stages in order.
public sealed class SaveReadingPathCommandHandler(
    IReadingPathRepository repository,
    IPathEnrollmentRepository enrollmentRepository,
    IBookRepository bookRepository,
    IUnitOfWork unitOfWork)
    : ICommandHandler<SaveReadingPathCommand, AdminReadingPathDto>
{
    public async Task<Result<AdminReadingPathDto>> Handle(SaveReadingPathCommand c, CancellationToken ct)
    {
        var bookIds = c.Stages.Select(s => s.BookId).Distinct().ToList();
        var found = await bookRepository.ListByIdsAsync(bookIds, ct);
        var missing = bookIds.Except(found.Select(b => b.Id)).ToList();
        if (missing.Count > 0)
            return Result.Failure<AdminReadingPathDto>(ReadingPathErrors.UnknownBooks(missing));

        ReadingPath? path;
        try
        {
            if (c.ReadingPathId is { } id)
            {
                path = await repository.GetByIdAsync(id, ct);
                if (path is null)
                    return Result.Failure<AdminReadingPathDto>(ReadingPathErrors.NotFound(id));

                path.Update(c.Title, c.Description, c.Level, c.EstimatedWeeks, c.DiscountPercentage, c.IsFeatured, c.DisplayOrder, c.Stages);
            }
            else
            {
                Slug slug;
                try { slug = Slug.Create(string.IsNullOrWhiteSpace(c.Slug) ? c.Title : c.Slug); }
                catch (ArgumentException) { return Result.Failure<AdminReadingPathDto>(ReadingPathErrors.InvalidSlug); }

                if (await repository.SlugExistsAsync(slug.Value, ct))
                    return Result.Failure<AdminReadingPathDto>(ReadingPathErrors.DuplicateSlug(slug.Value));

                path = ReadingPath.Create(c.Title, slug, c.Description, c.Level, c.EstimatedWeeks, c.DiscountPercentage, c.IsFeatured, c.DisplayOrder, c.Stages);
                repository.Add(path);
            }
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<AdminReadingPathDto>(ReadingPathErrors.Invalid(ex.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);

        var counts = await enrollmentRepository.CountPerPathAsync(ct);
        return Result.Success(path.ToAdminDto(counts.GetValueOrDefault(path.Id)));
    }
}

public sealed record SetReadingPathActiveCommand(int ReadingPathId, bool IsActive) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "ReadingPath";
    public string? AuditEntityId => ReadingPathId.ToString();
}

public sealed class SetReadingPathActiveCommandHandler(IReadingPathRepository repository, IUnitOfWork unitOfWork)
    : ICommandHandler<SetReadingPathActiveCommand>
{
    public async Task<Result> Handle(SetReadingPathActiveCommand command, CancellationToken ct)
    {
        var path = await repository.GetByIdAsync(command.ReadingPathId, ct);
        if (path is null)
            return Result.Failure(ReadingPathErrors.NotFound(command.ReadingPathId));

        if (command.IsActive) path.Activate();
        else path.Deactivate();

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed record DeleteReadingPathCommand(int ReadingPathId) : ICommand, IAuditableCommand
{
    public string AuditEntityType => "ReadingPath";
    public string? AuditEntityId => ReadingPathId.ToString();
}

public sealed class DeleteReadingPathCommandHandler(
    IReadingPathRepository repository, IPathEnrollmentRepository enrollmentRepository, IUnitOfWork unitOfWork)
    : ICommandHandler<DeleteReadingPathCommand>
{
    public async Task<Result> Handle(DeleteReadingPathCommand command, CancellationToken ct)
    {
        var path = await repository.GetByIdAsync(command.ReadingPathId, ct);
        if (path is null)
            return Result.Failure(ReadingPathErrors.NotFound(command.ReadingPathId));

        // People following a path keep seeing it in مساراتي; deleting it
        // would silently take that away. Hiding is the safe option.
        var enrolled = (await enrollmentRepository.CountPerPathAsync(ct)).GetValueOrDefault(path.Id);
        if (enrolled > 0)
            return Result.Failure(ReadingPathErrors.HasEnrollments(enrolled));

        repository.Remove(path);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public sealed record GetAdminReadingPathsQuery : IQuery<IReadOnlyList<AdminReadingPathDto>>;

public sealed class GetAdminReadingPathsQueryHandler(IReadingPathRepository repository, IPathEnrollmentRepository enrollmentRepository)
    : IQueryHandler<GetAdminReadingPathsQuery, IReadOnlyList<AdminReadingPathDto>>
{
    public async Task<Result<IReadOnlyList<AdminReadingPathDto>>> Handle(GetAdminReadingPathsQuery query, CancellationToken ct)
    {
        var paths = await repository.ListAsync(includeInactive: true, ct);
        var counts = await enrollmentRepository.CountPerPathAsync(ct);

        return Result.Success<IReadOnlyList<AdminReadingPathDto>>(
            paths.Select(p => p.ToAdminDto(counts.GetValueOrDefault(p.Id))).ToList());
    }
}