using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckoutExtensions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FreeShippingThreshold",
                table: "ShippingZones",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StandardCarrier",
                table: "ShippingZones",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StandardMaxDays",
                table: "ShippingZones",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StandardMinDays",
                table: "ShippingZones",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GiftMessage",
                table: "Orders",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "GiftWrap",
                table: "Orders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "GiftWrapFee",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "GiftWrapFee_Currency",
                table: "Orders",
                type: "nvarchar(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ShippingMethodCode",
                table: "Orders",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ShippingMethodName",
                table: "Orders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ShippingOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Carrier = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MinDays = table.Column<int>(type: "int", nullable: true),
                    MaxDays = table.Column<int>(type: "int", nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    ShippingZoneId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShippingOptions_ShippingZones_ShippingZoneId",
                        column: x => x.ShippingZoneId,
                        principalTable: "ShippingZones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShippingOptions_ShippingZoneId_Code",
                table: "ShippingOptions",
                columns: new[] { "ShippingZoneId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShippingOptions");

            migrationBuilder.DropColumn(
                name: "FreeShippingThreshold",
                table: "ShippingZones");

            migrationBuilder.DropColumn(
                name: "StandardCarrier",
                table: "ShippingZones");

            migrationBuilder.DropColumn(
                name: "StandardMaxDays",
                table: "ShippingZones");

            migrationBuilder.DropColumn(
                name: "StandardMinDays",
                table: "ShippingZones");

            migrationBuilder.DropColumn(
                name: "GiftMessage",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "GiftWrap",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "GiftWrapFee",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "GiftWrapFee_Currency",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingMethodCode",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingMethodName",
                table: "Orders");
        }
    }
}
