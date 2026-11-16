/**
 * Class Attendance List App
 * Pure Vanilla JavaScript with LocalStorage Persistence
 */

(() => {
  'use strict';

  // --- Constants & Storage ---
  const STORAGE_KEY = 'class_attendance_records_v1';

  // State
  let records = loadRecords();
  let editingId = null;
  let searchQuery = '';
  let activeFilter = 'all'; // 'all' | 'Present' | 'Absent'

  // DOM Elements
  const form = document.getElementById('attendance-form');
  const recordIdInput = document.getElementById('record-id');
  const studentNameInput = document.getElementById('student-name');
  const attendanceDateInput = document.getElementById('attendance-date');
  const formHeading = document.getElementById('form-heading');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnIcon = document.getElementById('submit-btn-icon');
  const submitBtnText = document.getElementById('submit-btn-text');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const editingIndicator = document.getElementById('editing-indicator');
  const formCard = document.querySelector('.form-card');

  const attendanceList = document.getElementById('attendance-list');
  const emptyState = document.getElementById('empty-state');
  const emptyIcon = document.getElementById('empty-icon');
  const emptyTitle = document.getElementById('empty-title');
  const emptyMessage = document.getElementById('empty-message');

  const statTotal = document.getElementById('stat-total');
  const statPresent = document.getElementById('stat-present');
  const statAbsent = document.getElementById('stat-absent');
  const recordsCounterPill = document.getElementById('records-counter-pill');

  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterTabs = document.querySelectorAll('.filter-tab');

  // --- Initialization ---
  function init() {
    setDefaultDate();
    setupEventListeners();
    render();
  }

  // Set default date in date input to today in YYYY-MM-DD
  function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    attendanceDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // --- LocalStorage Helpers ---
  function loadRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse records from localStorage:', e);
    }
    // Return empty array by default
    return [];
  }

  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records to localStorage:', e);
    }
  }

  // --- Record Operations ---
  function addRecord(name, date, status) {
    const newRecord = {
      id: 'att_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: name.trim(),
      date: date,
      status: status,
      createdAt: Date.now()
    };
    records.unshift(newRecord);
    saveRecords();
    render();
  }

  function updateRecord(id, name, date, status) {
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index] = {
        ...records[index],
        name: name.trim(),
        date: date,
        status: status
      };
      saveRecords();
      render();
    }
  }

  function deleteRecord(id) {
    const target = records.find(r => r.id === id);
    if (!target) return;

    const formattedDate = formatDateDisplay(target.date);
    const confirmed = window.confirm(
      `Are you sure you want to delete the attendance record for "${target.name}" on ${formattedDate}?`
    );

    if (confirmed) {
      records = records.filter(r => r.id !== id);
      saveRecords();

      // If we were editing this specific record, cancel edit mode
      if (editingId === id) {
        cancelEditMode();
      }

      render();
    }
  }

  // --- Edit Mode Handlers ---
  function startEditMode(record) {
    editingId = record.id;
    recordIdInput.value = record.id;
    studentNameInput.value = record.name;
    attendanceDateInput.value = record.date;

    // Set status radio
    const statusRadio = form.querySelector(`input[name="attendance-status"][value="${record.status}"]`);
    if (statusRadio) {
      statusRadio.checked = true;
    }

    // Update UI styling for editing
    formHeading.textContent = 'Edit Attendance';
    submitBtnIcon.textContent = '💾';
    submitBtnText.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'inline-flex';
    editingIndicator.style.display = 'inline-block';
    formCard.classList.add('is-editing');

    // Scroll form into view smoothly
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    studentNameInput.focus();

    // Re-render list to highlight current item being edited
    renderList();
  }

  function cancelEditMode() {
    editingId = null;
    recordIdInput.value = '';
    form.reset();
    setDefaultDate();

    // Default status back to Present
    const presentRadio = form.querySelector('input[name="attendance-status"][value="Present"]');
    if (presentRadio) presentRadio.checked = true;

    // Restore UI
    formHeading.textContent = 'Add New Attendance';
    submitBtnIcon.textContent = '➕';
    submitBtnText.textContent = 'Add Attendance';
    cancelEditBtn.style.display = 'none';
    editingIndicator.style.display = 'none';
    formCard.classList.remove('is-editing');

    renderList();
  }

  // --- Rendering ---
  function render() {
    renderStats();
    renderList();
  }

  // Update total counts at the top
  function renderStats() {
    const total = records.length;
    const presentCount = records.filter(r => r.status === 'Present').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;

    statTotal.textContent = total;
    statPresent.textContent = presentCount;
    statAbsent.textContent = absentCount;
  }

  // Render the list based on current records, search query, and filter
  function renderList() {
    const query = searchQuery.toLowerCase().trim();

    // Filter items
    let filtered = records.filter(record => {
      // Status filter
      if (activeFilter !== 'all' && record.status !== activeFilter) {
        return false;
      }
      // Search query (matches student name or formatted date)
      if (query) {
        const nameMatch = record.name.toLowerCase().includes(query);
        const dateMatch = record.date.includes(query) || formatDateDisplay(record.date).toLowerCase().includes(query);
        const statusMatch = record.status.toLowerCase().includes(query);
        return nameMatch || dateMatch || statusMatch;
      }
      return true;
    });

    // Sort by date descending, then by creation
    filtered.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // Update records pill counter
    const totalFiltered = filtered.length;
    recordsCounterPill.textContent = `${totalFiltered} ${totalFiltered === 1 ? 'record' : 'records'}`;

    // Handle Empty States
    if (records.length === 0) {
      // 1. Overall empty list
      attendanceList.innerHTML = '';
      emptyIcon.textContent = '🎒';
      emptyTitle.textContent = 'No attendance records yet';
      emptyMessage.textContent = 'Enter a student\'s name, choose a date, and click "Add Attendance" to start your class list.';
      emptyState.style.display = 'block';
      return;
    }

    if (filtered.length === 0) {
      // 2. Search/filter returned no results
      attendanceList.innerHTML = '';
      emptyIcon.textContent = '🔍';
      emptyTitle.textContent = 'No matching records found';
      if (query) {
        emptyMessage.innerHTML = `No attendance records match "<strong>${escapeHTML(searchQuery)}</strong>". Try checking the spelling or clearing filters.`;
      } else {
        emptyMessage.textContent = `No records marked as "${activeFilter}".`;
      }
      emptyState.style.display = 'block';
      return;
    }

    // List is not empty
    emptyState.style.display = 'none';
    attendanceList.innerHTML = '';

    const fragment = document.createDocumentFragment();

    filtered.forEach(record => {
      const itemEl = document.createElement('div');
      const isPresent = record.status === 'Present';
      const isEditing = record.id === editingId;

      itemEl.className = `record-item ${isPresent ? 'record-present' : 'record-absent'} ${isEditing ? 'is-being-edited' : ''}`;
      itemEl.dataset.id = record.id;

      const initials = getInitials(record.name);
      const displayDate = formatDateDisplay(record.date);

      itemEl.innerHTML = `
        <div class="record-main">
          <div class="student-avatar" title="${escapeHTML(record.name)}">
            ${escapeHTML(initials)}
          </div>
          <div class="record-details">
            <span class="student-name-text">${escapeHTML(record.name)}</span>
            <span class="record-date-text">
              <span>📅</span> ${escapeHTML(displayDate)}
            </span>
          </div>
        </div>

        <div class="record-actions-wrap">
          <span class="status-badge ${isPresent ? 'present' : 'absent'}">
            <span class="status-dot ${isPresent ? 'present-dot' : 'absent-dot'}"></span>
            ${escapeHTML(record.status)}
          </span>

          <div class="action-buttons">
            <button type="button" class="icon-action-btn btn-edit" title="Edit record" data-action="edit">
              ✏️ <span>Edit</span>
            </button>
            <button type="button" class="icon-action-btn btn-delete" title="Delete record" data-action="delete">
              🗑️ <span>Delete</span>
            </button>
          </div>
        </div>
      `;

      fragment.appendChild(itemEl);
    });

    attendanceList.appendChild(fragment);
  }

  // --- Formatting Helpers ---
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);

        return dateObj.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (e) {
      console.warn('Date parsing error:', e);
    }
    return dateStr;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Form Submission (Add or Update)
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = studentNameInput.value.trim();
      const date = attendanceDateInput.value;
      const statusRadio = form.querySelector('input[name="attendance-status"]:checked');
      const status = statusRadio ? statusRadio.value : 'Present';

      if (!name) {
        alert('Please enter a student name.');
        studentNameInput.focus();
        return;
      }

      if (!date) {
        alert('Please select a date.');
        attendanceDateInput.focus();
        return;
      }

      if (editingId) {
        // Update existing record
        updateRecord(editingId, name, date, status);
        cancelEditMode();
      } else {
        // Add new record
        addRecord(name, date, status);
        // Clear name input for convenient successive entry, keep date
        studentNameInput.value = '';
        studentNameInput.focus();
      }
    });

    // Cancel Edit Button
    cancelEditBtn.addEventListener('click', () => {
      cancelEditMode();
    });

    // List delegation for Edit and Delete buttons
    attendanceList.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const itemRow = btn.closest('.record-item');
      if (!itemRow) return;

      const id = itemRow.dataset.id;
      const record = records.find(r => r.id === id);
      if (!record) return;

      if (action === 'edit') {
        startEditMode(record);
      } else if (action === 'delete') {
        deleteRecord(id);
      }
    });

    // Live Search
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      clearSearchBtn.style.display = searchQuery.length > 0 ? 'inline-block' : 'none';
      renderList();
    });

    // Clear Search button
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      searchInput.focus();
      renderList();
    });

    // Filter Tabs (All / Present / Absent)
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        renderList();
      });
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

