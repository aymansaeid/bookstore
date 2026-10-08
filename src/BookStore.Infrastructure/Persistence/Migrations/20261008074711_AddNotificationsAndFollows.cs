using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationsAndFollows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MuhaqqiqFollows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    MuhaqqiqId = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MuhaqqiqFollows", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DedupKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BookId = table.Column<int>(type: "int", nullable: true),
                    BookTitle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BookSlug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MuhaqqiqId = table.Column<int>(type: "int", nullable: true),
                    MuhaqqiqName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    MuhaqqiqSlug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    OldPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    NewPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ReadAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WishlistItems_BookId",
                table: "WishlistItems",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_MuhaqqiqFollows_CustomerId_MuhaqqiqId",
                table: "MuhaqqiqFollows",
                columns: new[] { "CustomerId", "MuhaqqiqId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MuhaqqiqFollows_MuhaqqiqId",
                table: "MuhaqqiqFollows",
                column: "MuhaqqiqId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CustomerId_CreatedAtUtc",
                table: "Notifications",
                columns: new[] { "CustomerId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CustomerId_DedupKey",
                table: "Notifications",
                columns: new[] { "CustomerId", "DedupKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CustomerId_ReadAtUtc",
                table: "Notifications",
                columns: new[] { "CustomerId", "ReadAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MuhaqqiqFollows");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_WishlistItems_BookId",
                table: "WishlistItems");
        }
    }
}
