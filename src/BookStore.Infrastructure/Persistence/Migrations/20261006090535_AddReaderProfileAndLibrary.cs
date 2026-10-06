using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReaderProfileAndLibrary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InterestCategoryIds",
                table: "Customers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyBudget",
                table: "Customers",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReadingLevel",
                table: "Customers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LibraryEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    IsManuallyOwned = table.Column<bool>(type: "bit", nullable: false),
                    ReadingStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ProgressPercent = table.Column<int>(type: "int", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    FinishedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LibraryEntries", x => x.Id);
                    table.CheckConstraint("CK_LibraryEntries_Progress", "[ProgressPercent] BETWEEN 0 AND 100");
                });

            migrationBuilder.CreateIndex(
                name: "IX_LibraryEntries_CustomerId_BookId",
                table: "LibraryEntries",
                columns: new[] { "CustomerId", "BookId" },
                unique: true);

            migrationBuilder.Sql("UPDATE Customers SET InterestCategoryIds = N'[]' WHERE InterestCategoryIds = N'';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LibraryEntries");

            migrationBuilder.DropColumn(
                name: "InterestCategoryIds",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "MonthlyBudget",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "ReadingLevel",
                table: "Customers");
        }
    }
}
