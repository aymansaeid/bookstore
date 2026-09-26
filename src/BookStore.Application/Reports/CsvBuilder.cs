using System.Globalization;
using System.Text;

namespace BookStore.Application.Reports;

public enum CsvDelimiter
{
    /// "," separator, "." decimals. Google Sheets, Excel in US/UK locales.
    Comma = 0,

    /// ";" separator, "," decimals. Excel with Turkish or most EU regional settings.
    Semicolon = 1
}

public sealed class CsvBuilder(CsvDelimiter delimiter)
{
    private readonly StringBuilder _builder = new();

    private readonly char _separator = delimiter == CsvDelimiter.Semicolon ? ';' : ',';

    private readonly NumberFormatInfo _numbers = delimiter == CsvDelimiter.Semicolon
        ? CultureInfo.GetCultureInfo("tr-TR").NumberFormat
        : CultureInfo.InvariantCulture.NumberFormat;

    public void AddRow(params object?[] values)
    {
        for (var i = 0; i < values.Length; i++)
        {
            if (i > 0)
                _builder.Append(_separator);

            _builder.Append(FormatCell(values[i]));
        }

        _builder.Append("\r\n");
    }

    /// UTF-8 with a byte order mark: without the BOM, Excel guesses the
    /// encoding and turns "Şişli" into "ÅžiÅŸli".
    public byte[] ToUtf8WithBom()
    {
        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(_builder.ToString());

        var result = new byte[preamble.Length + body.Length];
        preamble.CopyTo(result, 0);
        body.CopyTo(result, preamble.Length);
        return result;
    }

    private string FormatCell(object? value) => value switch
    {
        null => string.Empty,
        // Numbers never go through text escaping: a negative amount must
        // stay "-5.00", not become "'-5.00".
        decimal d => d.ToString("0.00", _numbers),
        int n => n.ToString(CultureInfo.InvariantCulture),
        _ => EscapeText(value.ToString() ?? string.Empty)
    };

    private string EscapeText(string text)
    {
        // Formula injection: a cell starting with = + - @ (or tab/CR) is
        // executed by Excel. Customer-controlled text like a recipient name
        // could otherwise run =HYPERLINK(...) on your accountant's machine.
        if (text.Length > 0 && text[0] is '=' or '+' or '-' or '@' or '\t' or '\r')
            text = "'" + text;

        var needsQuoting =
            text.Contains(_separator) || text.Contains('"') || text.Contains('\n') || text.Contains('\r');

        return needsQuoting ? $"\"{text.Replace("\"", "\"\"")}\"" : text;
    }
}