using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOutboxRetryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OutboxMessages_ProcessedOnUtc",
                table: "OutboxMessages");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeadLettered",
                table: "OutboxMessages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "NextAttemptAtUtc",
                table: "OutboxMessages",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_ProcessedOnUtc_IsDeadLettered_NextAttemptAtUtc",
                table: "OutboxMessages",
                columns: new[] { "ProcessedOnUtc", "IsDeadLettered", "NextAttemptAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OutboxMessages_ProcessedOnUtc_IsDeadLettered_NextAttemptAtUtc",
                table: "OutboxMessages");

            migrationBuilder.DropColumn(
                name: "IsDeadLettered",
                table: "OutboxMessages");

            migrationBuilder.DropColumn(
                name: "NextAttemptAtUtc",
                table: "OutboxMessages");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_ProcessedOnUtc",
                table: "OutboxMessages",
                column: "ProcessedOnUtc");
        }
    }
}
