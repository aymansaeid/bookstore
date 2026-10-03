using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBookMerchandising : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Badges",
                table: "Books",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "CompareAtPrice",
                table: "Books",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EditionGroupId",
                table: "Books",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EditionLabel",
                table: "Books",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Highlights",
                table: "Books",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<bool>(
                name: "InstallmentsAllowed",
                table: "Books",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "Books",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Volumes",
                table: "Books",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BookRelations",
                columns: table => new
                {
                    RelatedBookId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookRelations", x => new { x.BookId, x.RelatedBookId });
                    table.ForeignKey(
                        name: "FK_BookRelations_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Books_EditionGroupId",
                table: "Books",
                column: "EditionGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookRelations");

            migrationBuilder.DropIndex(
                name: "IX_Books_EditionGroupId",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "Badges",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "CompareAtPrice",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "EditionGroupId",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "EditionLabel",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "Highlights",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "InstallmentsAllowed",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "Volumes",
                table: "Books");
        }
    }
}
