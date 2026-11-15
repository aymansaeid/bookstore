using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMultilingualContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "StockNotifications",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "Ar");

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "Orders",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "Ar");

            migrationBuilder.AddColumn<string>(
                name: "PreferredLanguage",
                table: "Customers",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "Ar");

            migrationBuilder.AddColumn<string>(
                name: "TransliteratedTitle",
                table: "Books",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BookTranslations",
                columns: table => new
                {
                    Language = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Subtitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Author = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    EditionLabel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Highlights = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookTranslations", x => new { x.BookId, x.Language });
                    table.ForeignKey(
                        name: "FK_BookTranslations_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CategoryTranslations",
                columns: table => new
                {
                    Language = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryTranslations", x => new { x.CategoryId, x.Language });
                    table.ForeignKey(
                        name: "FK_CategoryTranslations_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MuhaqqiqTranslations",
                columns: table => new
                {
                    Language = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    MuhaqqiqId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Bio = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Specialties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MuhaqqiqTranslations", x => new { x.MuhaqqiqId, x.Language });
                    table.ForeignKey(
                        name: "FK_MuhaqqiqTranslations_Muhaqqiqs_MuhaqqiqId",
                        column: x => x.MuhaqqiqId,
                        principalTable: "Muhaqqiqs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReadingPathStageTranslations",
                columns: table => new
                {
                    BookId = table.Column<int>(type: "int", nullable: false),
                    Language = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    ReadingPathId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReadingPathStageTranslations", x => new { x.ReadingPathId, x.BookId, x.Language });
                    table.ForeignKey(
                        name: "FK_ReadingPathStageTranslations_ReadingPaths_ReadingPathId",
                        column: x => x.ReadingPathId,
                        principalTable: "ReadingPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReadingPathTranslations",
                columns: table => new
                {
                    Language = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    ReadingPathId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReadingPathTranslations", x => new { x.ReadingPathId, x.Language });
                    table.ForeignKey(
                        name: "FK_ReadingPathTranslations_ReadingPaths_ReadingPathId",
                        column: x => x.ReadingPathId,
                        principalTable: "ReadingPaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShippingOptionTranslations",
                columns: table => new
                {
                    Code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Language = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    ShippingZoneId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingOptionTranslations", x => new { x.ShippingZoneId, x.Code, x.Language });
                    table.ForeignKey(
                        name: "FK_ShippingOptionTranslations_ShippingZones_ShippingZoneId",
                        column: x => x.ShippingZoneId,
                        principalTable: "ShippingZones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookTranslations");

            migrationBuilder.DropTable(
                name: "CategoryTranslations");

            migrationBuilder.DropTable(
                name: "MuhaqqiqTranslations");

            migrationBuilder.DropTable(
                name: "ReadingPathStageTranslations");

            migrationBuilder.DropTable(
                name: "ReadingPathTranslations");

            migrationBuilder.DropTable(
                name: "ShippingOptionTranslations");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "StockNotifications");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PreferredLanguage",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "TransliteratedTitle",
                table: "Books");
        }
    }
}
