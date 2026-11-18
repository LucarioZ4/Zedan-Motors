using Npgsql;

namespace ZedanMotorsApi.Services;

public static class ConsultasPostgres
{
    public static async Task<List<Dictionary<string, object?>>> Filas(this NpgsqlConnection db,
        string sql, params object?[] valores)
    {
        await using var cmd = new NpgsqlCommand(sql, db);
        foreach (var valor in valores)
            cmd.Parameters.Add(new NpgsqlParameter { Value = valor ?? DBNull.Value });
        await using var lector = await cmd.ExecuteReaderAsync();
        var filas = new List<Dictionary<string, object?>>();
        while (await lector.ReadAsync())
        {
            var fila = new Dictionary<string, object?>();
            for (var i = 0; i < lector.FieldCount; i++)
                fila[lector.GetName(i)] = lector.IsDBNull(i) ? null : lector.GetValue(i);
            filas.Add(fila);
        }
        return filas;
    }
}
