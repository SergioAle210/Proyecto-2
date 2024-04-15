document.addEventListener('DOMContentLoaded', function() {
    fetchTables();
    setupEventListeners();
});

function fetchTables() {
    fetch('http://localhost:3000/api/mesas')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok, status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const container = document.getElementById('tableContainer');
        container.innerHTML = '';
        if (!data.length) {
            container.innerHTML = '<p>No tables available.</p>';
            return;
        }
        data.forEach(mesa => {
            const tableDiv = document.createElement('div');
            tableDiv.className = 'table';
            tableDiv.innerHTML = `
                <h3>Mesa ${mesa.id_mesa} - Capacidad: ${mesa.capacidad}</h3>
                <p>Status: ${mesa.estado}</p>
            `;
            if (mesa.cuenta_estado === 'abierta' && mesa.id_cuenta) {
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Cerrar Cuenta';
                closeButton.onclick = () => closeAccount(mesa.id_cuenta);
                tableDiv.appendChild(closeButton);

                const orderButton = document.createElement('button');
                orderButton.textContent = 'Añadir Pedido';
                orderButton.onclick = () => openOrderModal(mesa.id_cuenta);
                tableDiv.appendChild(orderButton);
            } else {
                const openButton = document.createElement('button');
                openButton.textContent = 'Abrir Cuenta';
                openButton.onclick = () => openAccount(mesa.id_mesa);
                tableDiv.appendChild(openButton);
            }

            container.appendChild(tableDiv);
        });
    })
    .catch(error => console.error('Error loading tables:', error));
}

function setupEventListeners() {
    const addOrderForm = document.getElementById('addOrderForm');
    if (addOrderForm) {
        // Aquí cambiamos handleOrderSubmit por submitOrder
        addOrderForm.addEventListener('submit', submitOrder);
    } else {
        console.error('AddOrderForm not found');
    }
}


function openAccount(id_mesa) {
    fetch(`http://localhost:3000/api/mesas/${id_mesa}/abrir-cuenta`, { method: 'POST' })
    .then(response => response.ok ? response.json() : Promise.reject('Failed to open account'))
    .then(() => {
        alert('Account opened successfully!');
        fetchTables();
    })
    .catch(error => {
        console.error('Error opening account:', error);
        alert('Failed to open account: ' + error);
    });
}

function closeAccount(id_cuenta) {
    fetch(`http://localhost:3000/api/mesas/cuentas/${id_cuenta}/cerrar`, { method: 'PUT' })
    .then(response => response.ok ? response.json() : Promise.reject('Failed to close account'))
    .then(() => {
        alert('Account closed successfully!');
        fetchTables();
    })
    .catch(error => {
        console.error('Error closing account:', error);
        alert('Failed to close account: ' + error);
    });
}

function openOrderModal(idCuenta) {
    document.getElementById('idCuenta').value = idCuenta;
    fetchItems();
    document.getElementById('addOrderModal').style.display = 'block';
}


function fetchItems() {
    fetch('http://localhost:3000/api/items')
    .then(response => response.ok ? response.json() : Promise.reject('Failed to fetch items'))
    .then(items => populateItemSelect(items))
    .catch(error => console.error('Error fetching items:', error));
}

function populateItemSelect(items) {
    const select = document.getElementById('itemSelect');
    select.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id_item;
        option.textContent = `${item.nombre} - $${parseFloat(item.precio).toFixed(2)}`;
        select.appendChild(option);
    });
}

let pedidoActual = [];  // Array para mantener los ítems seleccionados

function addSelectedItem() {
    const select = document.getElementById('itemSelect');
    const idItem = select.value;  // Asegúrate de que esto no está undefined
    const itemName = select.options[select.selectedIndex].text;
    const cantidad = 1;

    if (!idItem) {
        console.error('No item ID selected');
        return;  // No añadir al pedido si idItem es undefined
    }

    pedidoActual.push({ idItem, itemName, cantidad });
    updateSelectedItemsList();
}


function updateSelectedItemsList() {
    const lista = document.getElementById('selectedItemsList');
    lista.innerHTML = '';  // Clear current list

    // Add each item in the array to the DOM
    pedidoActual.forEach(item => {
        const itemElement = document.createElement('li');
        itemElement.textContent = `${item.itemName} - Cantidad: ${item.cantidad}`;
        lista.appendChild(itemElement);
    });
}
function setupEventListeners() {
    const addOrderForm = document.getElementById('addOrderForm');
    if (addOrderForm) {
        addOrderForm.addEventListener('submit', submitOrder);
    }
}
function submitOrder(event) {
    event.preventDefault();
    const idCuenta = document.getElementById('idCuenta').value;
    const detalles = pedidoActual.map(item => ({
        idItem: item.idItem,
        cantidad: item.cantidad
    }));

    console.log('Sending order with details:', { idCuenta, detalles }); // Agregar para depuración

    fetch('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCuenta, detalles })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to submit order with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Pedido añadido:', data);
        alert('Pedido enviado correctamente y resumen generado!');
        pedidoActual = [];  // Limpiar el pedido actual
        updateSelectedItemsList();
        closeOrderModal(); // Cerrar modal si está abierto
        fetchTables(); // Refresca la lista de mesas para actualizar estados
    })
    .catch(error => {
        console.error('Error al enviar el pedido:', error);
        alert('Error al enviar el pedido: ' + error.message);
    });
}


function closeOrderModal() {
    document.getElementById('addOrderModal').style.display = 'none';
}




function closeOrderModal() {
    document.getElementById('addOrderModal').style.display = 'none';
}
