using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReadingPaths : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReadingPaths",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Level = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EstimatedWeeks = table.Column<int>(type: "int", nullable: false),
                    DiscountPercentage = table.Column<int>(type: "int", nullable: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReadingPaths", x => x.Id);
                    table.CheckConstraint("CK_ReadingPaths_Discount", "[DiscountPercentage] BETWEEN 0 AND 50");
                });

            migrationBuilder.CreateTable(
                name: "PathEnrollments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    ReadingPathId = table.Column<int>(type: "int", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathEnrollments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PathEnrollments_ReadingPaths_ReadingPathId",
                        column: x => x.ReadingPathId,
                        principalTable: "ReadingPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReadingPathStages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StageNumber = table.Column<int>(type: "int", nullable: false),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    EstimatedWeeks = table.Column<int>(type: "int", nullable: true),
                    ReadingPathId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReadingPathStages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReadingPathStages_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReadingPathStages_ReadingPaths_ReadingPathId",
                        column: x => x.ReadingPathId,
                        principalTable: "ReadingPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PathEnrollments_CustomerId_ReadingPathId",
                table: "PathEnrollments",
                columns: new[] { "CustomerId", "ReadingPathId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PathEnrollments_ReadingPathId",
                table: "PathEnrollments",
                column: "ReadingPathId");

            migrationBuilder.CreateIndex(
                name: "IX_ReadingPaths_Slug",
                table: "ReadingPaths",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReadingPathStages_BookId",
                table: "ReadingPathStages",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_ReadingPathStages_ReadingPathId",
                table: "ReadingPathStages",
                column: "ReadingPathId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PathEnrollments");

            migrationBuilder.DropTable(
                name: "ReadingPathStages");

            migrationBuilder.DropTable(
                name: "ReadingPaths");
        }
    }
}
