using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SearchText",
                table: "Books",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SearchTitle",
                table: "Books",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status_PaidAtUtc",
                table: "Orders",
                columns: new[] { "Status", "PaidAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderLines_BookId",
                table: "OrderLines",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_Books_IsActive_CategoryId",
                table: "Books",
                columns: new[] { "IsActive", "CategoryId" });

            migrationBuilder.CreateIndex(
                name: "IX_Books_IsActive_Id",
                table: "Books",
                columns: new[] { "IsActive", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_Status_PaidAtUtc",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_OrderLines_BookId",
                table: "OrderLines");

            migrationBuilder.DropIndex(
                name: "IX_Books_IsActive_CategoryId",
                table: "Books");

            migrationBuilder.DropIndex(
                name: "IX_Books_IsActive_Id",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "SearchText",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "SearchTitle",
                table: "Books");
        }
    }
}
