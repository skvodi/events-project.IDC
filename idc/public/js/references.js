document.addEventListener("DOMContentLoaded", () => {
    // Проверка доступа
    fetch("/api/check-auth")
        .then(r => r.json())
        .then(data => {
            if (!data.authenticated || data.user.role !== 'admin') {
                location.href = "/";
            }
        });

    // Загрузка всех справочников
    loadList('cities');
    loadList('categories');
    loadList('roles');
    loadList('statuses');
    loadEmployees();
    loadRolesForSelect();
});

// ===== ВКЛАДКИ =====
function switchTab(e, name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
    e.target.classList.add('active');
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// ===== УНИВЕРСАЛЬНЫЕ ФУНКЦИИ ДЛЯ ПРОСТЫХ СПРАВОЧНИКОВ =====

// Загрузка списка
function loadList(type) {
    fetch(`/api/${type}`)
        .then(r => r.json())
        .then(items => {
            const container = document.getElementById(`list-${type}`);
            if (items.length === 0) {
                container.innerHTML = '<p>Список пуст</p>';
                return;
            }
            container.innerHTML = items.map(item => `
                <div class="ref-item" id="${type}-${item.id}">
                    <div class="ref-item-view">
                        <span>${escapeHtml(item.name)}${item.priority !== undefined ? ' (приоритет: ' + escapeHtml(item.priority) + ')' : ''}</span>
                        <div class="btn-row">
                            <button class="btn-warning btn-sm" onclick="startEdit('${type}', ${item.id})">Изм.</button>
                            <button class="btn-danger btn-sm" onclick="deleteItem('${type}', ${item.id})">Удалить</button>
                        </div>
                    </div>
                    <div class="ref-item-edit" id="edit-${type}-${item.id}" style="display:none;">
                        <input type="text" id="edit-name-${type}-${item.id}" value="${escapeHtml(item.name)}">
                        ${item.priority !== undefined ? `<input type="number" id="edit-priority-${type}-${item.id}" value="${escapeHtml(item.priority)}" min="1">` : ''}
                        <div class="btn-row">
                            <button onclick="saveItem('${type}', ${item.id})">Сохранить</button>
                            <button class="btn-danger btn-sm" onclick="cancelEdit('${type}', ${item.id})">Отмена</button>
                        </div>
                    </div>
                </div>
            `).join("");
        });
}

// Добавление записи
function addItem(e, type) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    fetch(`/api/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.error) {
            alert(result.error);
            return;
        }
        form.reset();
        loadList(type);
    })
    .catch(() => alert("Ошибка добавления"));
}

// Начать редактирование
function startEdit(type, id) {
    document.getElementById(`edit-${type}-${id}`).style.display = 'flex';
    document.querySelector(`#${type}-${id} .ref-item-view`).style.display = 'none';
}

// Отмена редактирования
function cancelEdit(type, id) {
    document.getElementById(`edit-${type}-${id}`).style.display = 'none';
    document.querySelector(`#${type}-${id} .ref-item-view`).style.display = 'flex';
}

// Сохранить изменения
function saveItem(type, id) {
    const name = document.getElementById(`edit-name-${type}-${id}`).value;
    const priorityEl = document.getElementById(`edit-priority-${type}-${id}`);
    const data = { name };
    if (priorityEl) data.priority = priorityEl.value;

    fetch(`/api/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.error) {
            alert(result.error);
            return;
        }
        loadList(type);
    })
    .catch(() => alert("Ошибка сохранения"));
}

// Удалить запись
function deleteItem(type, id) {
    if (!confirm("Удалить запись?")) return;

    fetch(`/api/${type}/${id}`, { method: "DELETE" })
        .then(r => r.json())
        .then(result => {
            if (result.error) {
                alert(result.error);
                return;
            }
            loadList(type);
        })
        .catch(() => alert("Ошибка удаления"));
}

// ===== РАБОТНИКИ =====

function loadRolesForSelect() {
    fetch("/api/roles")
        .then(r => r.json())
        .then(roles => {
            const select = document.getElementById("employee-role-select");
            select.innerHTML = '<option value="">Выберите роль</option>';
            roles.forEach(role => {
                const option = document.createElement("option");
                option.value = role.id;
                option.textContent = role.name;
                select.appendChild(option);
            });
        });
}

function loadEmployees() {
    fetch("/api/employees")
        .then(r => r.json())
        .then(employees => {
            const container = document.getElementById("list-employees");
            if (employees.length === 0) {
                container.innerHTML = '<p>Список пуст</p>';
                return;
            }
            container.innerHTML = employees.map(emp => `
                <div class="ref-item" id="employees-${emp.id}">
                    <div class="ref-item-view">
                        <span>${escapeHtml(emp.full_name)} — ${escapeHtml(emp.email)} ${emp.phone ? '— ' + escapeHtml(emp.phone) : ''} (${escapeHtml(emp.role)})</span>
                        <div class="btn-row">
                            <button class="btn-warning btn-sm" onclick="startEditEmployee(${emp.id})">Изм.</button>
                            <button class="btn-danger btn-sm" onclick="deleteEmployee(${emp.id})">Удалить</button>
                        </div>
                    </div>
                    <div class="ref-item-edit" id="edit-employees-${emp.id}" style="display:none;">
                        <input type="text" id="edit-emp-name-${emp.id}" value="${escapeHtml(emp.full_name)}" placeholder="ФИО">
                        <input type="email" id="edit-emp-email-${emp.id}" value="${escapeHtml(emp.email)}" placeholder="Email">
                        <input type="text" id="edit-emp-phone-${emp.id}" value="${escapeHtml(emp.phone || '')}" placeholder="Телефон">
                        <input type="password" id="edit-emp-password-${emp.id}" placeholder="Новый пароль (оставьте пустым, чтобы не менять)">
                        <select id="edit-emp-role-${emp.id}"></select>
                        <div class="btn-row">
                            <button onclick="saveEmployee(${emp.id})">Сохранить</button>
                            <button class="btn-danger btn-sm" onclick="cancelEditEmployee(${emp.id})">Отмена</button>
                        </div>
                    </div>
                </div>
            `).join("");

            // Загружаем роли в селекты редактирования
            employees.forEach(emp => loadRolesForEmployeeEdit(emp.id, emp.role));
        });
}

function loadRolesForEmployeeEdit(empId, currentRole) {
    fetch("/api/roles")
        .then(r => r.json())
        .then(roles => {
            const select = document.getElementById(`edit-emp-role-${empId}`);
            if (!select) return;
            select.innerHTML = roles.map(role => `
                <option value="${role.id}" ${role.name === currentRole ? 'selected' : ''}>${escapeHtml(role.name)}</option>
            `).join("");
        });
}

function addEmployee(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.error) {
            alert(result.error);
            return;
        }
        form.reset();
        loadEmployees();
    })
    .catch(() => alert("Ошибка добавления"));
}

function startEditEmployee(id) {
    document.getElementById(`edit-employees-${id}`).style.display = 'flex';
    document.querySelector(`#employees-${id} .ref-item-view`).style.display = 'none';
}

function cancelEditEmployee(id) {
    document.getElementById(`edit-employees-${id}`).style.display = 'none';
    document.querySelector(`#employees-${id} .ref-item-view`).style.display = 'flex';
}

function saveEmployee(id) {
    const data = {
        full_name: document.getElementById(`edit-emp-name-${id}`).value,
        email: document.getElementById(`edit-emp-email-${id}`).value,
        phone: document.getElementById(`edit-emp-phone-${id}`).value,
        password: document.getElementById(`edit-emp-password-${id}`).value,
        role_id: document.getElementById(`edit-emp-role-${id}`).value
    };

    fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.error) {
            alert(result.error);
            return;
        }
        loadEmployees();
    })
    .catch(() => alert("Ошибка сохранения"));
}

function deleteEmployee(id) {
    if (!confirm("Удалить работника? Он будет удалён из всех мероприятий.")) return;

    fetch(`/api/employees/${id}`, { method: "DELETE" })
        .then(r => r.json())
        .then(result => {
            if (result.error) {
                alert(result.error);
                return;
            }
            loadEmployees();
        })
        .catch(() => alert("Ошибка удаления"));
}
