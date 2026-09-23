using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStockNotificationsAndWishlists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    ConfirmationTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IsConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    ConfirmedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    NotifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockNotifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WishlistItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    AddedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WishlistItems", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockNotifications_BookId_Email",
                table: "StockNotifications",
                columns: new[] { "BookId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockNotifications_BookId_IsConfirmed_NotifiedAtUtc",
                table: "StockNotifications",
                columns: new[] { "BookId", "IsConfirmed", "NotifiedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_StockNotifications_ConfirmationTokenHash",
                table: "StockNotifications",
                column: "ConfirmationTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_WishlistItems_CustomerId",
                table: "WishlistItems",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_WishlistItems_CustomerId_BookId",
                table: "WishlistItems",
                columns: new[] { "CustomerId", "BookId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockNotifications");

            migrationBuilder.DropTable(
                name: "WishlistItems");
        }
    }
}
