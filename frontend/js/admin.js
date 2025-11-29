// Check authentication
const user = getUser();
if (!user || user.role !== 'admin') {
  window.location.href = 'index.html';
}

document.getElementById('admin-name').textContent = user.name;
if (document.getElementById('admin-name-sidebar')) {
  document.getElementById('admin-name-sidebar').textContent = user.name;
  // Set avatar initial
  const avatar = document.querySelector('.sidebar-user-avatar');
  if (avatar) {
    avatar.textContent = user.name.charAt(0).toUpperCase();
  }
}

// Setup sidebar navigation
document.addEventListener('DOMContentLoaded', function() {
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.getAttribute('data-section');
      showSection(section);
    });
  });
});

// Sidebar navigation handler
function showSection(section) {
  // Remove active class from all nav items
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to clicked item
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-section') === section) {
      item.classList.add('active');
    }
  });
  
  // Scroll to the appropriate section
  let targetId = '';
  let shouldExpand = false;
  let expandFunction = null;
  
  switch(section) {
    case 'dashboard':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    case 'performance':
      targetId = 'overall-performance-card';
      break;
    case 'upload':
      targetId = 'upload-form';
      break;
    case 'users':
      targetId = 'manage-users-card';
      // Check if section needs to be expanded
      const manageUsersBody = document.getElementById('manage-users-body');
      if (manageUsersBody && manageUsersBody.style.display === 'none') {
        shouldExpand = true;
        expandFunction = toggleManageUsers;
      }
      break;
    case 'progress':
      targetId = 'progress-user-select';
      // Check if section needs to be expanded
      const progressBody = document.getElementById('user-progress-body');
      if (progressBody && progressBody.style.display === 'none') {
        shouldExpand = true;
        expandFunction = toggleUserProgress;
      }
      break;
    case 'settings':
      // Scroll to settings sections (create user and password reset)
      targetId = 'create-user-form';
      break;
  }
  
  if (targetId) {
    // Expand section if needed
    if (shouldExpand && expandFunction) {
      expandFunction();
    }
    
    // Scroll after a short delay to allow for expansion
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        const card = element.closest('.card');
        const scrollTarget = card || element;
        
        // Get position and scroll with offset for fixed header
        const elementPosition = scrollTarget.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 80;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, shouldExpand ? 150 : 0);
  }
}

let users = [];
let currentLeadId = null;
let currentViewedUserId = null;
let statusChart = null;
let overallStatusChart = null;
let userLeadsChart = null;
let selectedUserIds = [];
let currentUserLeads = []; // store leads from selected user for client-side filtering
let globalSearchTimer = null;

// Load users on page load
loadUsers();

async function loadUsers() {
  try {
    const response = await apiCall('/admin/users');
    const data = await response.json();
    
    users = data;
    
    // Populate progress user select
    const progressUserSelect = document.getElementById('progress-user-select');
    progressUserSelect.innerHTML = '<option value="">Select a user...</option>';
    users.forEach(u => {
      const option2 = document.createElement('option');
      option2.value = u._id;
      option2.textContent = `${u.name} (${u.email})`;
      progressUserSelect.appendChild(option2);
    });

    // Build custom multi-select for upload
    buildUserMultiSelect();

    // Populate transfer select if modal present
    const transferSelect = document.getElementById('transfer-user-select');
    if (transferSelect) {
      transferSelect.innerHTML = '<option value="">Select user...</option>';
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u._id;
        opt.textContent = `${u.name} (${u.email})`;
        transferSelect.appendChild(opt);
      });
    }

    // Refresh users management table
    renderUsersTable();
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function buildUserMultiSelect() {
  const toggle = document.getElementById('user-multiselect-toggle');
  const dropdown = document.getElementById('user-multiselect-dropdown');
  if (!toggle || !dropdown) return;

  dropdown.innerHTML = '';

  // Actions row
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'space-between';
  actions.style.marginBottom = '8px';
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'btn btn-secondary';
  selectAllBtn.textContent = 'Select All';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-secondary';
  clearBtn.textContent = 'Clear';
  actions.appendChild(selectAllBtn);
  actions.appendChild(clearBtn);
  dropdown.appendChild(actions);

  users.forEach(u => {
    const item = document.createElement('label');
    item.className = 'multi-select-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = u._id;
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!selectedUserIds.includes(u._id)) selectedUserIds.push(u._id);
      } else {
        selectedUserIds = selectedUserIds.filter(id => id !== u._id);
      }
      updateMultiSelectLabel();
    });
    const span = document.createElement('span');
    span.textContent = `${u.name} (${u.email})`;
    item.appendChild(cb);
    item.appendChild(span);
    dropdown.appendChild(item);
  });

  // Toggle handling
  toggle.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    const container = document.getElementById('user-multiselect');
    if (!container) return;
    if (!container.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  selectAllBtn.addEventListener('click', () => {
    selectedUserIds = users.map(u => u._id);
    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateMultiSelectLabel();
  });
  clearBtn.addEventListener('click', () => {
    selectedUserIds = [];
    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateMultiSelectLabel();
  });

  updateMultiSelectLabel();
}

function updateMultiSelectLabel() {
  const toggle = document.getElementById('user-multiselect-toggle');
  if (!toggle) return;
  if (selectedUserIds.length === 0) {
    toggle.textContent = 'Select users...';
  } else {
    const names = users.filter(u => selectedUserIds.includes(u._id)).map(u => u.name);
    toggle.textContent = `${names.join(', ')} (${selectedUserIds.length})`;
  }
}

// Create user form
document.getElementById('create-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('new-user-name').value;
  const email = document.getElementById('new-user-email').value;
  const password = document.getElementById('new-user-password').value;
  
  try {
    const response = await apiCall('/admin/create-user', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showCreateUserMessage(data.message, 'success');
      document.getElementById('create-user-form').reset();
      loadUsers(); // Reload user list
    } else {
      showCreateUserMessage(data.message || 'User creation failed', 'error');
    }
  } catch (error) {
    showCreateUserMessage('An error occurred', 'error');
    console.error('Create user error:', error);
  }
});

// Admin password reset form
document.getElementById('admin-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newPassword = document.getElementById('admin-new-password').value;
  
  try {
    const response = await apiCall('/admin/reset-my-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAdminPasswordMessage(data.message || 'Password reset successfully', 'success');
      document.getElementById('admin-password-form').reset();
    } else {
      showAdminPasswordMessage(data.message || 'Password reset failed', 'error');
    }
  } catch (error) {
    showAdminPasswordMessage('An error occurred', 'error');
    console.error('Admin password reset error:', error);
  }
});

function showAdminPasswordMessage(message, type) {
  const messageDiv = document.getElementById('admin-password-message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// Upload leads form
document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  const fileInput = document.getElementById('file-upload');
  const selectedUsers = selectedUserIds.slice();
  
  if (selectedUsers.length === 0) {
    showMessage('Please select at least one user', 'error');
    return;
  }
  
  if (!fileInput.files[0]) {
    showMessage('Please select a file', 'error');
    return;
  }
  
  formData.append('file', fileInput.files[0]);
  formData.append('userIds', JSON.stringify(selectedUsers));
  
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/upload-leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      let extra = '';
      if (data.skippedDuplicates !== undefined) {
        extra = ` | Added: ${data.addedCount} | Duplicates Skipped: ${data.skippedDuplicates}`;
      }
      if (data.distributionText) {
        extra += ` | Distribution: ${data.distributionText}`;
      }
      showMessage(data.message + extra, 'success');
      if (data.distribution && Array.isArray(data.distribution)) {
        renderDistributionGrid(data.distribution);
      }
      // Do not reset selected users to allow repeated uploads
      fileInput.value = '';
    } else {
      showMessage(data.message || 'Upload failed', 'error');
    }
  } catch (error) {
    showMessage('An error occurred during upload', 'error');
    console.error('Upload error:', error);
  }
});

function renderDistributionGrid(distribution) {
  const box = document.getElementById('upload-distribution');
  if (!box) return;
  if (!distribution || distribution.length === 0) {
    box.style.display = 'none';
    return;
  }
  const lines = distribution.map(d => `${d.userName}: ${d.count}`).join(' | ');
  box.innerHTML = `<strong>Assigned:</strong> ${lines}`;
  box.style.display = 'block';
}

// User progress selection
document.getElementById('progress-user-select').addEventListener('change', async (e) => {
  const userId = e.target.value;
  
  if (!userId) {
    document.getElementById('user-progress').style.display = 'none';
    currentUserLeads = [];
    return;
  }
  
  try {
    const response = await apiCall(`/admin/user-progress/${userId}`);
    const data = await response.json();
    
    if (response.ok) {
      displayUserProgress(data);
    }
  } catch (error) {
    console.error('Error loading user progress:', error);
  }
});

function displayUserProgress(data) {
  document.getElementById('user-progress').style.display = 'block';
  document.getElementById('progress-user-name').textContent = data.user.name;
  document.getElementById('total-leads').textContent = data.totalLeads;
  currentUserLeads = data.leads.slice();
  
  // Calculate and display user performance metrics
  const userLeads = data.leads;
  
  // Conversion rate
  const enrolled = userLeads.filter(l => l.status === 'Enrolled').length;
  const conversionRate = userLeads.length > 0 ? ((enrolled / userLeads.length) * 100).toFixed(1) : 0;
  document.getElementById('user-conversion-rate').textContent = conversionRate + '%';
  
  // Average follow-ups
  const totalFollowups = userLeads.reduce((sum, lead) => sum + (lead.statusHistory?.length || 0), 0);
  const avgFollowups = userLeads.length > 0 ? (totalFollowups / userLeads.length).toFixed(1) : 0;
  document.getElementById('user-avg-followups').textContent = avgFollowups;
  
  // Active leads
  const activeLeads = userLeads.filter(l => 
    l.status !== 'Enrolled' && 
    l.status !== 'Junk/not interested'
  ).length;
  document.getElementById('user-active-leads').textContent = activeLeads;
  
  // Display status breakdown
  const statusBreakdown = document.getElementById('status-breakdown');
  statusBreakdown.innerHTML = '';
  
  for (const [status, count] of Object.entries(data.statusBreakdown)) {
    const statusItem = document.createElement('div');
    statusItem.className = 'status-item';
    statusItem.innerHTML = `
      <h4>${status}</h4>
      <p>${count}</p>
    `;
    statusBreakdown.appendChild(statusItem);
  }
  
  // Create/Update Chart
  updateStatusChart(data.statusBreakdown);
  
  // Display leads table
  const tbody = document.getElementById('leads-tbody');
  tbody.innerHTML = '';
  
  data.leads.forEach(lead => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="clickable" data-lead-id="${lead.id}">${lead.name || ''}</td>
      <td class="clickable" data-lead-id="${lead.id}">${lead.contact || ''}</td>
      <td class="clickable" data-lead-id="${lead.id}">${lead.email || ''}</td>
      <td class="clickable" data-lead-id="${lead.id}">${lead.city || 'N/A'}</td>
      <td class="clickable" data-lead-id="${lead.id}">${lead.university || 'N/A'}</td>
      <td class="clickable" data-lead-id="${lead.id}">${lead.course || 'N/A'}</td>
      <td class="clickable" data-lead-id="${lead.id}">${lead.profession || 'N/A'}</td>
      <td class="clickable" data-lead-id="${lead.id}"><span class="lead-status status-${(lead.status||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}">${lead.status || ''}</span></td>
      <td class="clickable" data-lead-id="${lead.id}">${lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : ''}</td>
    `;
    tbody.appendChild(tr);
  });

  // Add click handlers to open modal
  tbody.querySelectorAll('.clickable').forEach(cell => {
    cell.addEventListener('click', () => {
      const leadId = cell.getAttribute('data-lead-id');
      openLeadModal(leadId);
    });
  });
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('upload-message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

function showCreateUserMessage(message, type) {
  const messageDiv = document.getElementById('create-user-message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

async function loadOverallStats() {
  try {
    const response = await apiCall('/admin/overall-stats');
    const data = await response.json();
    
    if (response.ok) {
      const container = document.getElementById('overall-stats-container');
      const statsDiv = document.getElementById('overall-stats');
      if (container) container.style.display = 'block';
      if (statsDiv) statsDiv.style.display = 'block';
      
      document.getElementById('overall-total-users').textContent = data.totalUsers;
      document.getElementById('overall-total-leads').textContent = data.totalLeads;
      
      // Create overall status chart
      createOverallStatusChart(data.statusBreakdown);
      
      // Create user leads chart
      createUserLeadsChart(data.userStats);
      
      // Calculate and display overall performance metrics
      const allLeadsResponse = await apiCall('/admin/all-leads');
      const allLeadsData = await allLeadsResponse.json();
      if (allLeadsResponse.ok && allLeadsData.leads) {
        const allLeads = allLeadsData.leads;
        
        // Conversion rate
        const enrolled = allLeads.filter(l => l.status === 'Enrolled').length;
        const conversionRate = allLeads.length > 0 ? ((enrolled / allLeads.length) * 100).toFixed(1) : 0;
        document.getElementById('overall-conversion-rate').textContent = conversionRate + '%';
        
        // Average follow-ups
        const totalFollowups = allLeads.reduce((sum, lead) => sum + (lead.statusHistory?.length || 0), 0);
        const avgFollowups = allLeads.length > 0 ? (totalFollowups / allLeads.length).toFixed(1) : 0;
        document.getElementById('overall-avg-followups').textContent = avgFollowups;
        
        // Active leads
        const activeLeads = allLeads.filter(l => 
          l.status !== 'Enrolled' && 
          l.status !== 'Junk/not interested'
        ).length;
        document.getElementById('overall-active-leads').textContent = activeLeads;
      }
    }
  } catch (error) {
    console.error('Error loading overall stats:', error);
  }
}

function createOverallStatusChart(statusBreakdown) {
  const ctx = document.getElementById('overallStatusChart');
  if (!ctx) return;
  
  const labels = Object.keys(statusBreakdown);
  const data = Object.values(statusBreakdown);
  
  const colors = {
    'Fresh': '#0066cc',
    'Buffer fresh': '#60a5fa',
    'Did not pick': '#9ca3af',
    'Request call back': '#8b5cf6',
    'Follow up': '#f59e0b',
    'Counselled': '#22c55e',
    'Interested in next batch': '#6366f1',
    'Registration fees paid': '#10b981',
    'Enrolled': '#2e7d32',
    'Junk/not interested': '#c2185b'
  };
  
  const backgroundColors = labels.map(label => colors[label] || '#667eea');
  
  if (overallStatusChart) {
    overallStatusChart.destroy();
  }
  
  overallStatusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Leads',
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 1,
        borderColor: backgroundColors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) { return context.parsed.y + ' leads'; }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      },
      onClick: async (evt, elements) => {
        if (!elements || elements.length === 0) return;
        const idx = elements[0].index;
        const status = labels[idx];
        await showStatusLeadsModal(status);
      }
    }
  });
}

// Show modal listing leads for a given status (modern schema fields)
async function showStatusLeadsModal(status) {
  try {
    const modal = document.getElementById('status-leads-modal');
    if (!modal) return;
    // Fetch all leads once (could be optimized server-side with a query param)
    const response = await apiCall('/admin/all-leads');
    const data = await response.json();
    if (!response.ok) return;
    const leads = data.leads.filter(l => l.status === status);

    // Populate header info
    document.getElementById('status-leads-title').textContent = `${status} Leads`;
    document.getElementById('status-leads-count').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''} with status "${status}"`;

    const tbody = document.getElementById('status-leads-tbody');
    tbody.innerHTML = '';
    leads.forEach(lead => {
      const tr = document.createElement('tr');
      tr.className = 'status-lead-row';
      tr.innerHTML = `
        <td>${lead.name || ''}</td>
        <td>${lead.contact || ''}</td>
        <td>${lead.email || ''}</td>
        <td>${lead.city || ''}</td>
        <td>${lead.university || ''}</td>
        <td>${lead.course || ''}</td>
        <td>${lead.profession || ''}</td>
        <td><span class="lead-status status-${(lead.status||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}">${lead.status}</span></td>
        <td>${lead.assignedTo && lead.assignedTo.name ? lead.assignedTo.name : 'Unassigned'}</td>
        <td>${lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : ''}</td>`;
      tr.addEventListener('click', () => {
        // Close status modal before opening lead modal to avoid layering issues
        closeStatusLeadsModal();
        openLeadModal(lead._id || lead.id); // handle either key
      });
      tbody.appendChild(tr);
    });

    // Prevent background scroll while modal open
    document.body.style.overflow = 'hidden';
    modal.style.display = 'flex';
    // Close when clicking backdrop
    modal.onclick = () => { closeStatusLeadsModal(); };
  } catch (err) {
    console.error('Error showing status leads modal', err);
  }
}

function closeStatusLeadsModal() {
  const modal = document.getElementById('status-leads-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
  // Remove backdrop click listener to avoid leaks
  modal.onclick = null;
}

async function showUsersForStatus(status) {
  // Fetch all leads and build a per-user grid for selected status
  try {
    const response = await apiCall('/admin/all-leads');
    const data = await response.json();
    if (!response.ok) return;
    const filtered = data.leads.filter(l => l.status === status);
    const counts = {};
    filtered.forEach(l => {
      const key = l.assignedToName || 'Unassigned';
      counts[key] = (counts[key] || 0) + 1;
    });
    // Render under the overall chart
    let container = document.getElementById('overall-status-grid');
    if (!container) {
      container = document.createElement('div');
      container.id = 'overall-status-grid';
      container.className = 'info-box';
      const overallSection = document.getElementById('overall-stats');
      if (overallSection) overallSection.appendChild(container);
    }
    const lines = Object.entries(counts).map(([name, cnt]) => `${name}: ${cnt}`).join(' | ');
    container.innerHTML = `<strong>${status}</strong> — ${lines || 'No leads'}`;
    container.style.display = 'block';
  } catch (err) {
    console.error('Error building status grid', err);
  }
}

function createUserLeadsChart(userStats) {
  const ctx = document.getElementById('userLeadsChart');
  if (!ctx) return;
  
  const labels = userStats.map(u => u.userName);
  const data = userStats.map(u => u.totalLeads);
  
  if (userLeadsChart) {
    userLeadsChart.destroy();
  }
  
  userLeadsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Leads',
        data: data,
        backgroundColor: '#667eea',
        borderColor: '#667eea',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.parsed.y + ' leads';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

function updateStatusChart(statusBreakdown) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  
  const labels = Object.keys(statusBreakdown);
  const data = Object.values(statusBreakdown);
  
  // Color palette for different statuses
  const colors = {
    'Fresh': '#0369a1',
    'Buffer fresh': '#1d4ed8',
    'Did not pick': '#374151',
    'Request call back': '#6d28d9',
    'Follow up': '#b45309',
    'Counselled': '#047857',
    'Interested in next batch': '#4338ca',
    'Registration fees paid': '#0f766e',
    'Enrolled': '#065f46',
    'Junk/not interested': '#b91c1c'
  };
  
  const backgroundColors = labels.map(label => colors[label] || '#667eea');
  
  // Destroy existing chart if present
  if (statusChart) {
    statusChart.destroy();
  }
  
  // Create new chart
  statusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Leads',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.parsed.y + ' leads';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

async function openLeadModal(leadId) {
  currentLeadId = leadId;
  try {
    const response = await apiCall(`/admin/lead/${leadId}`);
    const data = await response.json();
    if (!response.ok) return;
    document.getElementById('admin-modal-lead-name').textContent = data.name;
    document.getElementById('admin-modal-lead-contact').textContent = data.contact || 'N/A';
    document.getElementById('admin-modal-lead-email').textContent = data.email || 'N/A';
    document.getElementById('admin-modal-lead-city').textContent = data.city || 'N/A';
    document.getElementById('admin-modal-lead-university').textContent = data.university || 'N/A';
    document.getElementById('admin-modal-lead-course').textContent = data.course || 'N/A';
    document.getElementById('admin-modal-lead-profession').textContent = data.profession || 'N/A';
    document.getElementById('admin-modal-lead-status').textContent = data.status;

    // Status history
    const historyContainer = document.getElementById('admin-status-history');
    historyContainer.innerHTML = '';
    if (!data.statusHistory || data.statusHistory.length === 0) {
      historyContainer.innerHTML = '<p style="color:#999;">No status changes yet</p>';
    } else {
      data.statusHistory.sort((a,b)=> new Date(b.changedAt) - new Date(a.changedAt)).forEach(entry => {
        const div = document.createElement('div');
        div.className = 'note-item';
        div.innerHTML = `<div class="note-content"><strong>${entry.status}</strong></div><div class="note-date">${new Date(entry.changedAt).toLocaleString()}</div>`;
        historyContainer.appendChild(div);
      });
    }

    // Assignment history
    const assignContainer = document.getElementById('admin-assignment-history');
    if (assignContainer) {
      assignContainer.innerHTML = '';
      const ah = data.assignmentHistory || [];
      if (!ah.length) {
        assignContainer.innerHTML = '<p style="color:#999;">No assignment history</p>';
      } else {
        ah.sort((a,b)=> new Date(b.changedAt) - new Date(a.changedAt)).forEach(entry => {
          const div = document.createElement('div');
          div.className = 'note-item';
          const fromName = entry.fromUser ? entry.fromUser.name : 'None';
          const toName = entry.toUser ? entry.toUser.name : 'Unknown';
          div.innerHTML = `<div class="note-content"><strong>${entry.action}</strong> ${fromName} ➝ ${toName}</div><div class="note-date">${new Date(entry.changedAt).toLocaleString()}</div>`;
          assignContainer.appendChild(div);
        });
      }
    }

    // Notes
    const notesContainer = document.getElementById('admin-lead-notes');
    notesContainer.innerHTML = '';
    if (!data.notes || data.notes.length === 0) {
      notesContainer.innerHTML = '<p style="color:#999;">No notes</p>';
    } else {
      data.notes.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)).forEach(note => {
        const n = document.createElement('div');
        n.className = 'note-item';
        n.innerHTML = `<div class="note-content">${note.content}</div><div class="note-date">${new Date(note.createdAt).toLocaleString()}</div>`;
        notesContainer.appendChild(n);
      });
    }

    document.getElementById('admin-lead-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error loading lead detail', err);
  }
}

async function deleteLead() {
  if (!currentLeadId) return;
  
  const transferMsg = document.getElementById('transfer-message');
  transferMsg.innerHTML = `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 10px 0;">
      <p style="color: #dc2626; margin-bottom: 10px;"><strong>Confirm Delete</strong></p>
      <p style="color: #7f1d1d; margin-bottom: 12px;">This will permanently delete the lead. This action cannot be undone.</p>
      <div style="display: flex; gap: 10px;">
        <button onclick="confirmDeleteLead()" class="btn btn-danger">Delete Lead</button>
        <button onclick="cancelDeleteLead()" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
  `;
  transferMsg.style.display = 'block';
}

async function confirmDeleteLead() {
  try {
    const response = await apiCall(`/admin/lead/${currentLeadId}`, { method: 'DELETE' });
    const data = await response.json();
    if (response.ok) {
      showTransferMessage('Lead deleted successfully', 'success');
      closeAdminLeadModal();
      // Refresh user progress table if viewing a user
      const selectedUser = document.getElementById('progress-user-select').value;
      if (selectedUser) {
        const resp = await apiCall(`/admin/user-progress/${selectedUser}`);
        const progData = await resp.json();
        if (resp.ok) displayUserProgress(progData);
      }
      // Also refresh global search results if visible
      const q = document.getElementById('global-lead-search')?.value.trim();
      if (q) performGlobalSearch(q);
    } else {
      showTransferMessage(data.message || 'Delete failed', 'error');
    }
  } catch (err) {
    console.error('Delete lead error', err);
    showTransferMessage('Delete failed', 'error');
  }
}

function cancelDeleteLead() {
  const transferMsg = document.getElementById('transfer-message');
  transferMsg.style.display = 'none';
}

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td data-user-id="${u._id}" class="user-lead-count">...</td>
      <td>
        <button class="btn btn-secondary btn-sm" data-action="view" data-user-id="${u._id}">View</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-user-id="${u._id}" style="margin-left:6px;">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // Fetch lead counts asynchronously
  users.forEach(async u => {
    try {
      const resp = await apiCall(`/admin/user/${u._id}/details`);
      const data = await resp.json();
      if (resp.ok) {
        const cell = tbody.querySelector(`.user-lead-count[data-user-id='${u._id}']`);
        if (cell) cell.textContent = data.leadCount;
      }
    } catch (err) { /* ignore */ }
  });
  // Attach button handlers
  tbody.querySelectorAll('button[data-action="view"]').forEach(btn => {
    btn.addEventListener('click', () => viewUserDetails(btn.getAttribute('data-user-id')));
  });
  tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.getAttribute('data-user-id')));
  });
}

async function viewUserDetails(userId) {
  try {
    const resp = await apiCall(`/admin/user/${userId}/details`);
    const data = await resp.json();
    if (!resp.ok) return;
    currentViewedUserId = userId;
    document.getElementById('user-detail-name').textContent = data.name;
    document.getElementById('user-detail-email').textContent = data.email;
    document.getElementById('user-detail-role').textContent = data.role;
    document.getElementById('user-detail-created').textContent = new Date(data.createdAt).toLocaleString();
    document.getElementById('user-detail-leads').textContent = data.leadCount;
    
    // Show/hide admin password reset section
    const adminSection = document.getElementById('admin-password-reset-section');
    if (adminSection) {
      adminSection.style.display = data.role === 'admin' ? 'block' : 'none';
    }
    
    document.getElementById('user-detail-modal').style.display = 'flex';
  } catch (err) {
    console.error('User detail error', err);
  }
}

function closeUserDetailModal() {
  const modal = document.getElementById('user-detail-modal');
  if (modal) modal.style.display = 'none';
  currentViewedUserId = null;
}

async function deleteUser(userId) {
  const msgDiv = document.getElementById('users-message');
  msgDiv.innerHTML = `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;">
      <p style="color: #dc2626; margin-bottom: 10px;"><strong>Confirm Delete User</strong></p>
      <p style="color: #7f1d1d; margin-bottom: 12px;">Ensure all leads are transferred or deleted first. This action cannot be undone.</p>
      <div style="display: flex; gap: 10px;">
        <button onclick="confirmDeleteUser('${userId}')" class="btn btn-danger">Delete User</button>
        <button onclick="cancelDeleteUser()" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
  `;
  msgDiv.style.display = 'block';
}

async function confirmDeleteUser(userId) {
  try {
    const resp = await apiCall(`/admin/user/${userId}`, { method: 'DELETE' });
    const data = await resp.json();
    const msgDiv = document.getElementById('users-message');
    if (resp.ok) {
      msgDiv.innerHTML = '<span style="color: #059669;">User deleted successfully</span>';
      msgDiv.className = 'message success';
      msgDiv.style.display = 'block';
      // Refresh users list
      await loadUsers();
      renderUsersTable();
      setTimeout(()=> msgDiv.style.display='none',4000);
    } else {
      msgDiv.innerHTML = `<span style="color: #dc2626;">${data.message || 'Delete failed'}</span>`;
      msgDiv.className = 'message error';
      msgDiv.style.display = 'block';
      setTimeout(()=> msgDiv.style.display='none',5000);
    }
  } catch (err) {
    console.error('Delete user error', err);
    const msgDiv = document.getElementById('users-message');
    msgDiv.innerHTML = '<span style="color: #dc2626;">Delete failed</span>';
    msgDiv.className = 'message error';
    msgDiv.style.display = 'block';
    setTimeout(()=> msgDiv.style.display='none',5000);
  }
}

function cancelDeleteUser() {
  const msgDiv = document.getElementById('users-message');
  msgDiv.style.display = 'none';
}

// Initialize users table after initial load (loadUsers invoked on page load)
setTimeout(()=>{ renderUsersTable(); }, 800);

// Global lead search (debounced)
const globalSearchInput = document.getElementById('global-lead-search');
if (globalSearchInput) {
  globalSearchInput.addEventListener('input', () => {
    const q = globalSearchInput.value.trim();
    if (globalSearchTimer) clearTimeout(globalSearchTimer);
    globalSearchTimer = setTimeout(() => performGlobalSearch(q), 300);
  });
}

async function performGlobalSearch(query) {
  const resultsWrapper = document.getElementById('global-search-results');
  const tbody = document.getElementById('global-search-tbody');
  const emptyDiv = document.getElementById('global-search-empty');
  if (!resultsWrapper || !tbody) return;
  if (!query) {
    resultsWrapper.style.display = 'none';
    tbody.innerHTML = '';
    emptyDiv.style.display = 'none';
    return;
  }
  try {
    const response = await apiCall(`/admin/search-leads?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!response.ok) return;
    tbody.innerHTML = '';
    if (!data.results.length) {
      emptyDiv.style.display = 'block';
    } else {
      emptyDiv.style.display = 'none';
      data.results.forEach(lead => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.name || ''}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.contact || ''}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.email || ''}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.city || 'N/A'}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.university || 'N/A'}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.course || 'N/A'}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.profession || 'N/A'}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\"><span class=\"lead-status status-${(lead.status||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}\">${lead.status || ''}</span></td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.assignedTo ? (lead.assignedTo.name || 'Unassigned') : 'Unassigned'}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.notesCount || 0}</td>
          <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : ''}</td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.clickable').forEach(cell => {
        cell.addEventListener('click', () => {
          const leadId = cell.getAttribute('data-lead-id');
          openLeadModal(leadId);
        });
      });
    }
    resultsWrapper.style.display = 'block';
  } catch (err) {
    console.error('Global search error', err);
  }
}

// Per-user lead filtering
const userLeadSearchInput = document.getElementById('user-lead-search');
if (userLeadSearchInput) {
  userLeadSearchInput.addEventListener('input', () => {
    const q = userLeadSearchInput.value.trim().toLowerCase();
    const tbody = document.getElementById('leads-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filtered = !q ? currentUserLeads : currentUserLeads.filter(l => (
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.contact && String(l.contact).toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.city && l.city.toLowerCase().includes(q)) ||
      (l.university && l.university.toLowerCase().includes(q)) ||
      (l.course && l.course.toLowerCase().includes(q)) ||
      (l.profession && l.profession.toLowerCase().includes(q)) ||
      (l.status && l.status.toLowerCase().includes(q))
    ));
    filtered.forEach(lead => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.name || ''}</td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.contact || ''}</td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.email || ''}</td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.city || 'N/A'}</td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.university || 'N/A'}</td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.course || 'N/A'}</td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.profession || 'N/A'}</td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\"><span class=\"lead-status status-${(lead.status||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}\">${lead.status || ''}</span></td>
        <td class=\"clickable\" data-lead-id=\"${lead.id}\">${lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : ''}</td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.clickable').forEach(cell => {
      cell.addEventListener('click', () => {
        const leadId = cell.getAttribute('data-lead-id');
        openLeadModal(leadId);
      });
    });
  });
}

function closeAdminLeadModal() {
  document.getElementById('admin-lead-modal').style.display = 'none';
  currentLeadId = null;
}

// Global escape key handler for all modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close admin lead modal
    const adminLeadModal = document.getElementById('admin-lead-modal');
    if (adminLeadModal && adminLeadModal.style.display === 'flex') {
      closeAdminLeadModal();
    }
    
    // Close status leads modal
    const statusLeadsModal = document.getElementById('status-leads-modal');
    if (statusLeadsModal && statusLeadsModal.style.display === 'flex') {
      closeStatusLeadsModal();
    }
  }
});

async function transferLead() {
  if (!currentLeadId) return;
  const newUserId = document.getElementById('transfer-user-select').value;
  if (!newUserId) {
    showTransferMessage('Please select a user to transfer', 'error');
    return;
  }
  try {
    // Get current lead data to check if transfer is to same user
    const leadResp = await apiCall(`/admin/lead/${currentLeadId}`);
    const leadData = await leadResp.json();
    if (leadResp.ok && leadData.assignedTo && leadData.assignedTo._id === newUserId) {
      showTransferMessage('Lead is already assigned to this user', 'error');
      return;
    }

    const response = await apiCall(`/admin/transfer-lead/${currentLeadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ newUserId })
    });
    const data = await response.json();
    if (response.ok) {
      showTransferMessage('Lead transferred successfully', 'success');
      // Refresh modal content to reflect updated assignment history
      await openLeadModal(currentLeadId);
      const selectedUser = document.getElementById('progress-user-select').value;
      if (selectedUser) {
        const resp = await apiCall(`/admin/user-progress/${selectedUser}`);
        const progData = await resp.json();
        if (resp.ok) displayUserProgress(progData);
      }
    } else {
      showTransferMessage(data.message || 'Transfer failed', 'error');
    }
  } catch (err) {
    console.error('Transfer error', err);
    showTransferMessage('Transfer failed', 'error');
  }
}

function showTransferMessage(message, type) {
  const messageDiv = document.getElementById('transfer-message');
  if (!messageDiv) return;
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// Close modal on outside click
const adminLeadModal = document.getElementById('admin-lead-modal');
if (adminLeadModal) {
  adminLeadModal.addEventListener('click', (e) => {
    if (e.target.id === 'admin-lead-modal') {
      closeAdminLeadModal();
    }
  });
}

// (Removed duplicate outdated showStatusLeadsModal & closeStatusLeadsModal definitions using legacy fields)

// Collapsible Manage Users
function toggleManageUsers() {
  const body = document.getElementById('manage-users-body');
  const icon = document.getElementById('manage-users-toggle');
  if (!body || !icon) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.textContent = '−';
  } else {
    body.style.display = 'none';
    icon.textContent = '+';
  }
}

// Collapsible Overall Dashboard
function toggleOverallDashboard() {
  const body = document.getElementById('overall-dashboard-body');
  const icon = document.getElementById('overall-dashboard-toggle');
  if (!body || !icon) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.textContent = '−';
  } else {
    body.style.display = 'none';
    icon.textContent = '+';
  }
}

// Collapsible Create User
function toggleCreateUser() {
  const body = document.getElementById('create-user-body');
  const icon = document.getElementById('create-user-toggle');
  if (!body || !icon) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.textContent = '−';
  } else {
    body.style.display = 'none';
    icon.textContent = '+';
  }
}

// Collapsible User Progress
function toggleUserProgress() {
  const body = document.getElementById('user-progress-body');
  const icon = document.getElementById('user-progress-toggle');
  if (!body || !icon) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.textContent = '−';
  } else {
    body.style.display = 'none';
    icon.textContent = '+';
  }
}

// Collapsible Admin Password
function toggleAdminPassword() {
  const body = document.getElementById('admin-password-body');
  const icon = document.getElementById('admin-password-toggle');
  if (!body || !icon) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.textContent = '−';
  } else {
    body.style.display = 'none';
    icon.textContent = '+';
  }
}

// Reset user password
async function resetUserPassword() {
  const msgDiv = document.getElementById('user-detail-reset-message');
  if (!currentViewedUserId) {
    if (msgDiv) {
      msgDiv.textContent = 'No user selected';
      msgDiv.className = 'message error';
      msgDiv.style.display = 'block';
    }
    return;
  }
  const input = document.getElementById('reset-password-input');
  const newPassword = input ? input.value.trim() : '';
  if (!newPassword) {
    msgDiv.textContent = 'Enter a new password';
    msgDiv.className = 'message error';
    msgDiv.style.display = 'block';
    return;
  }
  try {
    const resp = await apiCall(`/admin/user/${currentViewedUserId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    const data = await resp.json();
    if (resp.ok) {
      msgDiv.textContent = data.message || 'Password reset';
      msgDiv.className = 'message success';
      input.value = '';
    } else {
      msgDiv.textContent = data.message || 'Reset failed';
      msgDiv.className = 'message error';
    }
    msgDiv.style.display = 'block';
    setTimeout(()=> { msgDiv.style.display='none'; }, 5000);
  } catch (err) {
    console.error('Reset password error', err);
    msgDiv.textContent = 'Reset failed';
    msgDiv.className = 'message error';
    msgDiv.style.display = 'block';
  }
}

// Reset admin's own password
async function resetAdminPassword() {
  const msgDiv = document.getElementById('admin-reset-message');
  const input = document.getElementById('admin-reset-password-input');
  const newPassword = input ? input.value.trim() : '';
  if (!newPassword) {
    msgDiv.textContent = 'Enter a new password';
    msgDiv.className = 'message error';
    msgDiv.style.display = 'block';
    return;
  }
  try {
    const resp = await apiCall('/admin/reset-my-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    const data = await resp.json();
    if (resp.ok) {
      msgDiv.textContent = data.message || 'Admin password reset successfully';
      msgDiv.className = 'message success';
      input.value = '';
    } else {
      msgDiv.textContent = data.message || 'Reset failed';
      msgDiv.className = 'message error';
    }
    msgDiv.style.display = 'block';
    setTimeout(()=> { msgDiv.style.display='none'; }, 5000);
  } catch (err) {
    console.error('Reset admin password error', err);
    msgDiv.textContent = 'Reset failed';
    msgDiv.className = 'message error';
    msgDiv.style.display = 'block';
  }
}
