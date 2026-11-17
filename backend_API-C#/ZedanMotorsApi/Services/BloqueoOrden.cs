using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;

namespace ZedanMotorsApi.Services;

public static class BloqueoOrden
{
    // Dentro de una transacción, antes de comprobar factura, líneas o stock.
    public static async Task<bool> BloquearOrdenAsync(this AppDBContext context, int id)
    {
        var filas = await context.OrdenesTrabajo
            .FromSqlInterpolated($"SELECT * FROM orden_trabajo WHERE id_orden = {id} FOR UPDATE")
            .AsNoTracking().ToListAsync();
        return filas.Count != 0;
    }
}
