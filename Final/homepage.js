const HOST = 'http://exam-2023-1-api.std-900.ist.mospolytech.ru';
const API_KEY = '90c0df04-2bdb-46f3-b872-c10bc12aa70c';

const holidays = [
    "1-1", "1-2", "1-3", "1-4", "1-5", "1-6", "1-7",
    "1-8", "2-23", "3-8", "5-1", "5-9", "6-12", "11-4"
]; 

let routesData;
let filteredRoutes;
let guide;

const itemsPerPage = 5;
let currentPage = 1;

const editModal = document.getElementById('editModal');
const dateField = editModal.querySelector('#orderDate');
const timeField = editModal.querySelector('#startTime');
const durationField = editModal.querySelector('#orderDuration');
const personsField = editModal.querySelector('#personsCount');
const priceField = editModal.querySelector('#price');
const studentField = editModal.querySelector('#isStudent');
const transportField = editModal.querySelector('#isTransport');


function isThisDayOff(dateString) { // высчитывает день недели
    let date = new Date(dateString);
    let day = date.getDay();
    let MonthDay = (date.getMonth() + 1) + '-' + date.getDate();
    if (day === 0 || day === 6 || holidays.includes(MonthDay)) {
        return 1.5; 
    }

    return 1;
}

function getTimeExtra(startTime) { // высчитывает время начала
    let time = startTime.split(":");
    let hours = parseInt(time[0]); 

    if (hours >= 9 && hours <= 12) {        
        return 400;
    } else if (hours >= 20 && hours <= 23) { 
        return 1000;
    }

    return 0;
}

function calculateCost(guideCost, duration, date, startTime, 
    personsNumber, students, transport) { // высчитывает общую сумму
    let price = guideCost * duration * isThisDayOff(date);
    price += personsNumber > 5 && personsNumber <= 10 ? 1000 : 0;
    price += personsNumber > 10 && personsNumber <= 20 ? 1500 : 0;
    if (transport && (isThisDayOff(date) == 1.5)){
        price *= 1.25;
    } else if (transport && (isThisDayOff(date) == 1)){
        price *= 1.3;
    }
    price *= students ? 0.85 : 1;
    return Math.floor(price);
}

function calculateOrderCost() { // выводит общую сумму
    
    const date = dateField.value;
    const time = timeField.value;
    const persons = personsField.value;
    const duration = durationField.value;
    const student = studentField.checked;
    const transport = transportField.checked;
 
    const cost = calculateCost(editModal.guide.pricePerHour, duration, date,
        time, persons, student, transport);
    priceField.textContent = cost + ' рублей.';

                                  
    return cost;
}

function clearTable() { // очистка таблицы
    const tableBody = document.getElementById('ordersTable');
    tableBody.innerHTML = '';
}

async function addRoutesToTable(orders) { // добавление, просмотр и удаление данных в таблице
    const tableBody = document.getElementById('ordersTable');
    orders.forEach(async (order) => {
        const route = await fetch(
            `${HOST}/api/routes/${order.route_id}?api_key=${API_KEY}`
        ).then(response => response.json())
        .catch(function(err){
            alert('Fetch Error');
        });

        const guide = await fetch(
            `${HOST}/api/guides/${order.guide_id}?api_key=${API_KEY}`
        ).then(response => response.json())
        .catch(function(err){
            alert('Fetch Error');
        });

        const row = tableBody.insertRow();
        row.insertCell(0).innerHTML = order.id;
        row.insertCell(1).innerHTML = route.name;
        row.insertCell(2).innerHTML = order.date;
        row.insertCell(3).innerHTML = String(Number(order.price) + 1000);

        const buttons = document.getElementById('orderButtons').cloneNode(true);
        const viewModal = document.querySelector('#viewModal');
        const editModal = document.querySelector('#editModal');
        const deleteModal = document.querySelector('#deleteModal');

        row.insertCell(4).appendChild(buttons);

        buttons.classList.remove('none');
        buttons.querySelector('#viewOrderButton').addEventListener('click', () => {
                viewModal.querySelector('#routeName').value = route.name;
                viewModal.querySelector('#guideFullName').value = guide.name;
                viewModal.querySelector('#orderDate').value = order.date;
                viewModal.querySelector('#startTime').value = order.time;
                viewModal.querySelector('#orderDuration').value = order.duration;
                viewModal.querySelector('#personsCount').value = order.persons;

                const all = document.getElementById('additionsBlock');
                const first = document.getElementById('firstAddition');
                const second = document.getElementById('secondAddition');

                all.classList.remove("none");
                first.classList.remove("none");
                second.classList.remove("none");

                if (!order.optionFirst && !order.optionSecond) {
                    all.classList.add("none");
                } else if (!order.optionFirst) {
                    first.classList.add("none");
                } else if (!order.optionSecond) {
                    second.classList.add("none");
                }

                viewModal.querySelector('#price').textContent = order.price + ' рублей.';
            },
        );
        buttons.querySelector('#editOrderButton').addEventListener('click', () => { 
                updateModal(order, route, guide);
            },
        );
        buttons.querySelector('#deleteOrderButton').addEventListener('click', () => {
                deleteModal.onclick = async () => {
                    const requestOptions = {
                        method: 'DELETE',
                        redirect: 'follow'
                    };

                    const guide = await fetch(`${HOST}/api/orders/${order.id}?api_key=${API_KEY}`,requestOptions).then(response => response.json()); 
                    fetchOrdersFromApi();
                };
            }
        );
    });
}

function updateTable() {// обновление таблицы после изменений
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentRoutes = filteredRoutes ?
        filteredRoutes.slice(startIndex, endIndex) :
        routesData.slice(startIndex, endIndex);
  
    clearTable();
    addRoutesToTable(currentRoutes);
    updatePagination();
}

function fetchOrdersFromApi() {
    fetch(
        `${HOST}/api/orders?api_key=${API_KEY}`
    )
        .then(response => response.json())
        .then(data => {
            routesData = data;
            updateTable();
        })
        .catch(error => console.error('Error fetching route data:', error));
}

function createPaginationItem(text, pageNumber) {// создает строку с номерами для пагинации
    const pageItem = document.createElement('li');
    pageItem.className = 'page-item my-pagination';
  
    const pageLink = document.createElement('a');
    pageLink.className = 'page-link my-link';
    pageLink.href = 'javascript:void(0)';
    pageLink.innerText = text;
  
    if (
        (text === 'Назад' && currentPage === 1) ||
        (text === 'Вперед' && 
            currentPage === Math.ceil((filteredRoutes ? 
                filteredRoutes.length : routesData.length) / itemsPerPage)
        )) {
        pageItem.classList.add('disabled');
        pageItem.classList.remove('my-pagination');
        pageItem.classList.add('my-pagination');
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            handlePageClick(pageNumber);
        });
    } else {
        pageLink.addEventListener('click', () => handlePageClick(pageNumber));
    }
 
    if (pageNumber === currentPage) {
        pageItem.classList.add('active');
    }
  
    pageItem.appendChild(pageLink);
  
    return pageItem;
}

function updatePagination() {// обновлении таблицы на основе пагинации
    const paginationElement = document.getElementById('pagination');
    const totalPages = Math.ceil((filteredRoutes ? filteredRoutes.length :
        routesData.length) / itemsPerPage);
  
    paginationElement.innerHTML = '';
  
    const prevItem = createPaginationItem('Назад', currentPage - 1);
    paginationElement.appendChild(prevItem);
  
    for (let i = 1; i <= totalPages; i++) {
        const pageItem = createPaginationItem(i, i);
        paginationElement.appendChild(pageItem);
    }
  
    const nextItem = createPaginationItem('Вперед', currentPage + 1);
    paginationElement.appendChild(nextItem);
}

function updatePaginationAfterSearch(filteredRoutes) {// обновляет элементы пагинации на основе фильтрации
    const paginationElement = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);
  
    paginationElement.innerHTML = '';
  
    const prevItem = createPaginationItem('Назад', currentPage - 1);
    paginationElement.appendChild(prevItem);
  
    for (let i = 1; i <= totalPages; i++) {
        const pageItem = createPaginationItem(i, i);
        paginationElement.appendChild(pageItem);
    }
  
    const nextItem = createPaginationItem('Вперед', currentPage + 1);
    paginationElement.appendChild(nextItem);
}

function handlePageClick(pageNumber) { // вызывает разные значения в соответствии со страницей
    currentPage = pageNumber;
    updateTable();
}

function updateModal(order, route, guide) { // изменение заявки
    editModal.guide = guide;

    editModal.querySelector('#routeName').value = route.name;
    editModal.querySelector('#guideFullName').value = guide.name;
    dateField.value = order.date;
    timeField.value = order.time;
    durationField.value = order.duration;
    personsField.value = order.persons
    priceField.textContent = order.price + ' рублей.';

    studentField.checked = order.optionFirst;
    transportField.checked = order.optionSecond;

    editModal.querySelector('#sendData').onclick = async () => {
        const formData = new FormData();

        formData.append("id", order.id);
        formData.append("date", dateField.value);
        formData.append("time", timeField.value);
        formData.append("duration", durationField.value);
        formData.append("persons", personsField.value);
        formData.append("price", calculateOrderCost());
        formData.append("optionFirst", Number(studentField.checked));
        formData.append("optionSecond", Number(transportField.checked));

        const requestOptions = {
            method: 'PUT',
            body: formData,
            redirect: 'follow'
        };
        console.log(formData);

        const guide = await fetch(
            `${HOST}/api/orders/${order.id}?api_key=${API_KEY}`,
            requestOptions
        ).then(response => response.json())
        .catch(function(err){
            alert('Fetch Error')
        }); 

        fetchOrdersFromApi();
    };
}

window.onload = function() {
    dateField.addEventListener('change', calculateOrderCost);
    timeField.addEventListener('change', calculateOrderCost); 
    durationField.addEventListener('change', calculateOrderCost);
    personsField.addEventListener('change', calculateOrderCost);
    priceField.addEventListener('change', calculateOrderCost); 
    studentField.addEventListener('change', calculateOrderCost);
    transportField.addEventListener('change', calculateOrderCost);
    fetchOrdersFromApi();
};