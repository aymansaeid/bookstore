using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_StripeCheckoutSessionId",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "StripePaymentIntentId",
                table: "Orders",
                newName: "RefundReference");

            migrationBuilder.RenameColumn(
                name: "StripeCheckoutSessionId",
                table: "Orders",
                newName: "PaymentReference");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CheckoutExpiresAtUtc",
                table: "Orders",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckoutIdempotencyKey",
                table: "Orders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CheckoutSessionId",
                table: "Orders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckoutUrl",
                table: "Orders",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RefundedAtUtc",
                table: "Orders",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "TermsAcceptedAtUtc",
                table: "Orders",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "TermsAcceptedFromIp",
                table: "Orders",
                type: "nvarchar(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TermsVersion",
                table: "Orders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LowStockAlertedAtUtc",
                table: "Books",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LowStockThreshold",
                table: "Books",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AuditLog",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OccurredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    AdminUserId = table.Column<int>(type: "int", nullable: true),
                    ActorName = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DetailsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLog", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProcessedPaymentEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessedPaymentEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    AuthorDisplayName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Body = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ModerationNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ModeratedByAdminId = table.Column<int>(type: "int", nullable: true),
                    ModeratedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.CheckConstraint("CK_Reviews_RatingRange", "[Rating] BETWEEN 1 AND 5");
                });

            migrationBuilder.CreateTable(
                name: "StockMovements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookId = table.Column<int>(type: "int", nullable: false),
                    QuantityDelta = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OrderId = table.Column<int>(type: "int", nullable: true),
                    AdminUserId = table.Column<int>(type: "int", nullable: true),
                    OccurredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockMovements", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CheckoutIdempotencyKey",
                table: "Orders",
                column: "CheckoutIdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_CheckoutSessionId",
                table: "Orders",
                column: "CheckoutSessionId",
                unique: true,
                filter: "[CheckoutSessionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status_CheckoutExpiresAtUtc",
                table: "Orders",
                columns: new[] { "Status", "CheckoutExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLog_AdminUserId",
                table: "AuditLog",
                column: "AdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLog_EntityType_EntityId",
                table: "AuditLog",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLog_OccurredAtUtc",
                table: "AuditLog",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessedPaymentEvents_EventId",
                table: "ProcessedPaymentEvents",
                column: "EventId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_BookId_Status_CreatedAtUtc",
                table: "Reviews",
                columns: new[] { "BookId", "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_CustomerId_BookId",
                table: "Reviews",
                columns: new[] { "CustomerId", "BookId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_Status_CreatedAtUtc",
                table: "Reviews",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_BookId_OccurredAtUtc",
                table: "StockMovements",
                columns: new[] { "BookId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_OrderId",
                table: "StockMovements",
                column: "OrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLog");

            migrationBuilder.DropTable(
                name: "ProcessedPaymentEvents");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CheckoutIdempotencyKey",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_CheckoutSessionId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_Status_CheckoutExpiresAtUtc",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CheckoutExpiresAtUtc",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CheckoutIdempotencyKey",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CheckoutSessionId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CheckoutUrl",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RefundedAtUtc",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TermsAcceptedAtUtc",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TermsAcceptedFromIp",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TermsVersion",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "LowStockAlertedAtUtc",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "LowStockThreshold",
                table: "Books");

            migrationBuilder.RenameColumn(
                name: "RefundReference",
                table: "Orders",
                newName: "StripePaymentIntentId");

            migrationBuilder.RenameColumn(
                name: "PaymentReference",
                table: "Orders",
                newName: "StripeCheckoutSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_StripeCheckoutSessionId",
                table: "Orders",
                column: "StripeCheckoutSessionId",
                unique: true,
                filter: "[StripeCheckoutSessionId] IS NOT NULL");
        }
    }
}
