using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookStore.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddImageVariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Height",
                table: "BookImages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VariantWidths",
                table: "BookImages",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Width",
                table: "BookImages",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Height",
                table: "BookImages");

            migrationBuilder.DropColumn(
                name: "VariantWidths",
                table: "BookImages");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "BookImages");
        }
    }
}
