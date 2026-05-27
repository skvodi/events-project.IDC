document.addEventListener("DOMContentLoaded", () => {
    fetch("/api/check-auth")
        .then(r => r.json())
        .then(data => {
            if (!data.authenticated) {
                location.href = "/";
                return;
            }
            updateBackLink(data.user?.role);
            loadEvent();
        });
});

function updateBackLink(role) {
    const link = document.getElementById("backToEventsLink");
    if (!link) return;

    if (role === "admin") {
        link.href = "/admin.html";
    } else if (role === "manager") {
        link.href = "/manager.html";
    } else {
        link.href = "/employee.html";
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function displayValue(value) {
    return value ? escapeHtml(value) : "-";
}

function isRegistrationClosed(event) {
    return Boolean(event.is_finished) ||
        (event.registration_end && Date.parse(event.registration_end) < Date.now()) ||
        (event.event_date && Date.parse(event.event_date) < Date.now());
}

function renderEventPhotos(photos = []) {
    if (!photos.length) return "<p>Галерея не загружена</p>";
    return `
        <div class="event-photos">
            ${photos.map(photo => `
                <a href="${escapeHtml(photo.url)}" target="_blank">
                    <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.name || "Фото мероприятия")}">
                </a>
            `).join("")}
        </div>
    `;
}

function renderEventFiles(files = []) {
    if (!files.length) return "<p>Прикрепленных файлов нет</p>";
    return `
        <div class="event-files">
            ${files.map(file => `
                <a href="${escapeHtml(file.url)}" target="_blank" download="${escapeHtml(file.name || "")}">
                    ${escapeHtml(file.name || "Файл")}
                </a>
            `).join("")}
        </div>
    `;
}

function renderEventOptions(options = []) {
    if (!options.length) return "<p>Опции не привязаны</p>";
    return `
        <div class="event-option-list">
            ${options.map(option => `
                <span>
                    ${escapeHtml(option.name)} (${escapeHtml(option.type_name)}${option.is_required ? ", обязательная" : ""})
                    ${option.values && option.values.length ? `: ${escapeHtml(option.values.join(", "))}` : ""}
                </span>
            `).join("")}
        </div>
    `;
}

function renderRegistrationForm(event) {
    if (event.is_registered && isRegistrationClosed(event)) {
        return '<button class="btn-full" disabled>Запись закрыта</button>';
    }
    if (event.is_registered) {
        return `<button class="btn-leave" onclick="leaveEvent(${event.id})">Отменить запись</button>`;
    }
    if (isRegistrationClosed(event)) {
        return '<button class="btn-full" disabled>Регистрация закрыта</button>';
    }
    if (event.max_participants && event.participants_count >= event.max_participants) {
        return '<button class="btn-full" disabled>Мест нет</button>';
    }

    return `
        <form class="event-form" onsubmit="joinEvent(event, ${event.id})">
            <button type="submit">Записаться</button>
        </form>
    `;
}

function loadEvent() {
    const id = new URLSearchParams(location.search).get("id");
    const container = document.getElementById("eventDetails");
    if (!id) {
        container.innerHTML = "<p>Мероприятие не выбрано</p>";
        return;
    }

    fetch(`/api/events/${id}`)
        .then(r => r.json())
        .then(event => {
            if (event.error) {
                container.innerHTML = `<p>${escapeHtml(event.error)}</p>`;
                return;
            }

            const places = event.max_participants
                ? `${event.participants_count ?? 0} / ${event.max_participants}`
                : `${event.participants_count ?? 0}`;

            container.innerHTML = `
                <article class="event event-detail ${event.is_finished ? "event-finished" : ""}">
                    <h2>${escapeHtml(event.name)}${event.is_finished ? " — завершено" : ""}</h2>
                    <p><strong>Полное описание:</strong> ${displayValue(event.description)}</p>
                    <p><strong>Дата проведения:</strong> ${displayValue(event.event_date)}</p>
                    <p><strong>Дата окончания регистрации:</strong> ${displayValue(event.registration_end)}</p>
                    <p><strong>Доступные места:</strong> ${escapeHtml(places)}</p>
                    <p><strong>Город:</strong> ${displayValue(event.city)}</p>
                    <p><strong>Адрес:</strong> ${displayValue(event.address)}</p>
                    <h3>Галерея</h3>
                    ${renderEventPhotos(event.photos)}
                    <h3>Прикрепленные файлы</h3>
                    ${renderEventFiles(event.files)}
                    <h3>Опции мероприятия</h3>
                    ${renderEventOptions(event.options)}
                    <h3>Регистрация</h3>
                    ${renderRegistrationForm(event)}
                </article>
            `;
        })
        .catch(() => {
            container.innerHTML = "<p>Ошибка загрузки мероприятия</p>";
        });
}

function joinEvent(event, id) {
    event.preventDefault();
    fetch(`/api/events/${id}/join`, { method: "POST" })
        .then(r => r.json())
        .then(result => {
            if (result.error) {
                alert(result.error);
                return;
            }
            loadEvent();
        })
        .catch(() => alert("Ошибка записи"));
}

function leaveEvent(id) {
    if (!confirm("Отменить запись?")) return;

    fetch(`/api/events/${id}/leave`, { method: "DELETE" })
        .then(r => r.json())
        .then(result => {
            if (result.error) {
                alert(result.error);
                return;
            }
            loadEvent();
        })
        .catch(() => alert("Ошибка отмены"));
}
