const express = require('express');
const router = express.Router();
const pool = require('../../conn');  

// Controladores
const obtenerPedido = async (req, res) => {
  try {
    const { id_cuenta } = req.params;
    console.log(`Fetching order details for account: ${id_cuenta}`);

    const pedido = await pool.query(
      `SELECT p.id_pedido, p.fecha_hora_pedido, dp.id_item, i.nombre, dp.cantidad, i.precio, (dp.cantidad * i.precio) as subtotal
       FROM cuentas c
       JOIN pedidos p ON c.id_cuenta = p.id_cuenta
       JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
       JOIN items i ON dp.id_item = i.id_item
       WHERE c.id_cuenta = $1;`,
      [id_cuenta]
    );
    console.log('Order details:', pedido.rows);

    res.json(pedido.rows);
    console.log(`Detalles del pedido enviados con éxito para id_cuenta ${id_cuenta}`);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los detalles del pedido');
  }
};

const obtenerFactura = async (req, res) => {
  try {
    const { id_factura } = req.params;
    const factura = await pool.query(
      `SELECT f.*, dp.id_pedido, i.nombre, dp.cantidad, i.precio, (dp.cantidad * i.precio) as subtotal
       FROM facturas f
       JOIN pedidos p ON f.id_cuenta = p.id_cuenta
       JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
       JOIN items i ON dp.id_item = i.id_item
       WHERE f.id_factura = $1;`,
      [id_factura]
    );
    res.json(factura.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener la factura');
  }
};

const cerrarCuentaYGenerarFactura = async (req, res) => {
  const { id_cuenta, nit_cliente, nombre_cliente, direccion_cliente } = req.body;
  try {
    await pool.query('BEGIN'); // Start transaction
    // Close the account
    const updatedAccount = await pool.query(
      'UPDATE cuentas SET estado = \'cerrada\', fecha_cierre = NOW() WHERE id_cuenta = $1 RETURNING *',
      [id_cuenta]
    );

    // Calculate total from orders
    const orders = await pool.query(
      'SELECT sum(precio * cantidad) AS total FROM pedidos JOIN detalle_pedido ON pedidos.id_pedido = detalle_pedido.id_pedido WHERE id_cuenta = $1',
      [id_cuenta]
    );
    const total = orders.rows[0].total;

    // Generate invoice
    const invoice = await pool.query(
      'INSERT INTO facturas (id_cuenta, nit_cliente, nombre_cliente, direccion_cliente, total, fecha) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [id_cuenta, nit_cliente, nombre_cliente, direccion_cliente, total]
    );

    await pool.query('COMMIT'); // Commit transaction
    res.status(201).json({ account: updatedAccount.rows[0], invoice: invoice.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error closing account and generating invoice:', error);
    res.status(500).send('Failed to close account and generate invoice');
  }
};


const registrarPagoDeFactura = async (req, res) => {
  const { id_factura, monto, tipo_pago } = req.body;
  try {
    await pool.query(
      'INSERT INTO pagos (id_factura, monto, tipo_pago) VALUES ($1, $2, $3);',
      [id_factura, monto, tipo_pago]
    );
    res.status(201).send('Pago registrado correctamente');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al registrar el pago');
  }
};

// Rutas
router.get('/cuentas/:id_cuenta/pedido', obtenerPedido);
router.get('/facturas/:id_factura', obtenerFactura);
router.post('/facturas', cerrarCuentaYGenerarFactura);
router.post('/pagos', registrarPagoDeFactura);

module.exports = router;
