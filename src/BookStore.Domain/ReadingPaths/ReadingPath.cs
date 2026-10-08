using BookStore.Domain.Books;
using BookStore.Domain.Common;

namespace BookStore.Domain.ReadingPaths;

public sealed record ReadingPathStageInput(int BookId, string Reason, int? EstimatedWeeks);

/// One step of a path. Identity-keyed, so a full replace (clear + add) never
/// trips EF's "same key already tracked" problem.
public sealed class ReadingPathStage : Entity<int>
{
    public int StageNumber { get; private set; }
    public int BookId { get; private set; }

    /// «✦ لماذا هذا الكتاب»
    public string Reason { get; private set; } = string.Empty;

    public int? EstimatedWeeks { get; private set; }

    private ReadingPathStage() { } // EF Core

    internal static ReadingPathStage Create(int stageNumber, ReadingPathStageInput input) =>
        new()
        {
            StageNumber = stageNumber,
            BookId = input.BookId,
            Reason = input.Reason.Trim(),
            EstimatedWeeks = input.EstimatedWeeks
        };
}

public sealed class ReadingPath : AggregateRoot<int>
{
    public const int MinStages = 2;
    public const int MaxStages = 10;
    public const int MaxDiscountPercentage = 50;
    public const int MaxTitleLength = 200;
    public const int MaxDescriptionLength = 1000;
    public const int MaxReasonLength = 300;

    public string Title { get; private set; } = string.Empty;
    public Slug Slug { get; private set; } = null!;
    public string? Description { get; private set; }
    public ReaderLevel Level { get; private set; }
    public int EstimatedWeeks { get; private set; }

    /// «خصم المسار»: applies to the path's books bought together (P3b).
    public int DiscountPercentage { get; private set; }

    /// Shown on the home page. "Most chosen" is calculated, not set.
    public bool IsFeatured { get; private set; }

    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    private readonly List<ReadingPathStage> _stages = [];
    public IReadOnlyCollection<ReadingPathStage> Stages => _stages.AsReadOnly();

    public IReadOnlyList<ReadingPathStage> OrderedStages => _stages.OrderBy(s => s.StageNumber).ToList();

    private ReadingPath() { } // EF Core

    public static ReadingPath Create(
        string title, Slug slug, string? description, ReaderLevel level, int estimatedWeeks,
        int discountPercentage, bool isFeatured, int displayOrder, IReadOnlyList<ReadingPathStageInput> stages)
    {
        var path = new ReadingPath { Slug = slug, IsActive = true, CreatedAtUtc = DateTimeOffset.UtcNow };
        path.Update(title, description, level, estimatedWeeks, discountPercentage, isFeatured, displayOrder, stages);
        return path;
    }

    public void Update(
        string title, string? description, ReaderLevel level, int estimatedWeeks,
        int discountPercentage, bool isFeatured, int displayOrder, IReadOnlyList<ReadingPathStageInput> stages)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > MaxTitleLength)
            throw new ArgumentException($"Title is required, at most {MaxTitleLength} characters.", nameof(title));

        var trimmedDescription = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        if (trimmedDescription is { Length: > MaxDescriptionLength })
            throw new ArgumentException($"Description can be at most {MaxDescriptionLength} characters.", nameof(description));

        if (estimatedWeeks is < 1 or > 520)
            throw new ArgumentOutOfRangeException(nameof(estimatedWeeks), "Estimated weeks must be between 1 and 520.");
        if (discountPercentage is < 0 or > MaxDiscountPercentage)
            throw new ArgumentOutOfRangeException(nameof(discountPercentage), $"Discount must be between 0 and {MaxDiscountPercentage}%.");

        if (stages.Count is < MinStages or > MaxStages)
            throw new ArgumentException($"A path has {MinStages} to {MaxStages} stages.", nameof(stages));
        if (stages.Select(s => s.BookId).Distinct().Count() != stages.Count)
            throw new ArgumentException("Each book can appear only once in a path.", nameof(stages));
        if (stages.Any(s => string.IsNullOrWhiteSpace(s.Reason) || s.Reason.Trim().Length > MaxReasonLength))
            throw new ArgumentException($"Each stage needs a reason of at most {MaxReasonLength} characters.", nameof(stages));
        if (stages.Any(s => s.EstimatedWeeks is < 1 or > 104))
            throw new ArgumentException("A stage's weeks must be between 1 and 104.", nameof(stages));

        Title = title.Trim();
        Description = trimmedDescription;
        Level = level;
        EstimatedWeeks = estimatedWeeks;
        DiscountPercentage = discountPercentage;
        IsFeatured = isFeatured;
        DisplayOrder = displayOrder;

        _stages.Clear();
        for (var i = 0; i < stages.Count; i++)
            _stages.Add(ReadingPathStage.Create(i + 1, stages[i]));
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;
}