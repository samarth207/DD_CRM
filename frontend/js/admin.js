// Role validation - ensure admin is on admin page
(function validateAdminRole() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user && user.role !== 'admin') {
    // User token found on admin page - redirect to user page
    console.log('Non-admin user detected on admin page, redirecting to user page');
    window.location.replace('user.html');
  }
})();

// ===== ADMIN UPDATE POLLING SYSTEM =====
let adminLastCheckTimestamp = Date.now();
let adminUpdateCheckInterval = null;

// Start polling for updates from users
function startAdminUpdatePolling() {
  // Check for updates every 20 seconds
  adminUpdateCheckInterval = setInterval(checkForAdminUpdates, 20000);
  console.log('Admin update polling started');
}

// Stop polling
function stopAdminUpdatePolling() {
  if (adminUpdateCheckInterval) {
    clearInterval(adminUpdateCheckInterval);
    adminUpdateCheckInterval = null;
  }
}

// Check for updates from users
async function checkForAdminUpdates() {
  try {
    // Don't check for updates if a modal is open (admin is editing)
    const leadModal = document.getElementById('admin-lead-modal');
    if (leadModal && leadModal.style.display === 'flex') {
      return; // Skip this check
    }
    
    const response = await apiCall(`/admin/check-updates?lastCheck=${adminLastCheckTimestamp}`);
    
    if (!response) {
      stopAdminUpdatePolling();
      return;
    }
    
    if (response.ok) {
      const data = await response.json();
      if (data.hasUpdates) {
        showAdminUpdateNotification(data.updateCount || 1);
        adminLastCheckTimestamp = data.latestTimestamp;
      }
    }
  } catch (error) {
    console.error('Error checking for admin updates:', error);
  }
}

// Show admin update notification banner
function showAdminUpdateNotification(updateCount) {
  const banner = document.getElementById('admin-update-notification-banner');
  if (banner) {
    banner.style.display = 'block';
    const messageDiv = document.getElementById('admin-update-notification-message');
    if (messageDiv) {
      const message = `${updateCount} lead${updateCount > 1 ? 's have' : ' has'} been updated by users. Click refresh to see the latest changes.`;
      messageDiv.textContent = message;
    }
  }
}

// Dismiss admin update notification
function dismissAdminUpdateNotification() {
  const banner = document.getElementById('admin-update-notification-banner');
  if (banner) {
    banner.style.display = 'none';
  }
  adminLastCheckTimestamp = Date.now();
}

// Refresh admin data
async function refreshAdminData() {
  dismissAdminUpdateNotification();
  await refreshDashboard();
  adminLastCheckTimestamp = Date.now();
  showMessage('Data refreshed successfully', 'success');
}

// Modal functions for Add Brochure
function openAddBrochureModal() {
  const modal = document.getElementById('add-brochure-modal');
  modal.style.display = 'flex';
  document.getElementById('upload-brochure-form').reset();
  document.getElementById('upload-brochure-message').style.display = 'none';
}

function closeAddBrochureModal() {
  const modal = document.getElementById('add-brochure-modal');
  modal.style.display = 'none';
  document.getElementById('upload-brochure-form').reset();
  document.getElementById('upload-brochure-message').style.display = 'none';
}

// Modal functions for Create User
function openCreateUserModal() {
  const modal = document.getElementById('create-user-modal');
  modal.style.display = 'flex';
  document.getElementById('create-user-form').reset();
  document.getElementById('create-user-message').style.display = 'none';
}

function closeCreateUserModal() {
  const modal = document.getElementById('create-user-modal');
  modal.style.display = 'none';
  document.getElementById('create-user-form').reset();
  document.getElementById('create-user-message').style.display = 'none';
}

// Global Escape key handler for all modals
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    // Close filtered user distribution modal first (highest priority)
    const filteredUserDistModal = document.getElementById('filtered-user-distribution-modal');
    if (filteredUserDistModal && filteredUserDistModal.style.display === 'flex') {
      closeFilteredUserDistributionModal();
      return;
    }
    
    // Close filtered leads graph modal
    const filteredLeadsGraphModal = document.getElementById('filtered-leads-graph-modal');
    if (filteredLeadsGraphModal && filteredLeadsGraphModal.style.display === 'flex') {
      closeFilteredLeadsGraphModal();
      return;
    }
    
    // Close admin lead modal
    const adminLeadModal = document.getElementById('admin-lead-modal');
    if (adminLeadModal && adminLeadModal.style.display === 'flex') {
      closeAdminLeadModal();
      return;
    }
    
    // Close status leads modal
    const statusLeadsModal = document.getElementById('status-leads-modal');
    if (statusLeadsModal && statusLeadsModal.style.display === 'flex') {
      closeStatusLeadsModal();
      return;
    }
    
    // Close status distribution modal
    const statusDistModal = document.getElementById('status-distribution-modal');
    if (statusDistModal && statusDistModal.style.display === 'flex') {
      closeStatusDistributionModal();
      return;
    }
    
    // Close brochure modal
    const brochureModal = document.getElementById('add-brochure-modal');
    if (brochureModal && brochureModal.style.display === 'flex') {
      closeAddBrochureModal();
      return;
    }
    
    // Close create user modal
    const userModal = document.getElementById('create-user-modal');
    if (userModal && userModal.style.display === 'flex') {
      closeCreateUserModal();
      return;
    }
    
    // Close user detail modal
    const detailModal = document.getElementById('user-detail-modal');
    if (detailModal && detailModal.style.display === 'flex') {
      closeUserDetailModal();
      return;
    }
  }
});

// Upload brochure form
document.getElementById('upload-brochure-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const university = document.getElementById('brochure-university').value.trim();
  const course = document.getElementById('brochure-course').value.trim();
  const fileInput = document.getElementById('brochure-file');
  if (!university || !course) {
    showBrochureMessage('Please enter university and course', 'error');
    return;
  }
  if (!fileInput.files[0]) {
    showBrochureMessage('Please select a PDF file', 'error');
    return;
  }
  const formData = new FormData();
  formData.append('university', university);
  formData.append('course', course);
  formData.append('file', fileInput.files[0]);
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/upload-brochure`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      showBrochureMessage(data.message || 'Brochure uploaded successfully', 'success');
      document.getElementById('upload-brochure-form').reset();
      loadBrochuresAdmin(); // Refresh list
      setTimeout(() => closeAddBrochureModal(), 1500); // Close modal after success
    } else {
      showBrochureMessage(data.message || 'Upload failed', 'error');
    }
  } catch (error) {
    showBrochureMessage('An error occurred during upload', 'error');
    console.error('Brochure upload error:', error);
  }
});

function showBrochureMessage(message, type) {
  const msgDiv = document.getElementById('upload-brochure-message');
  msgDiv.textContent = message;
  msgDiv.className = `message ${type}`;
  msgDiv.style.display = 'block';
  setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
}

// Load and display all brochures for admin
async function loadBrochuresAdmin() {
  const listDiv = document.getElementById('brochures-admin-list');
  if (!listDiv) return;
  listDiv.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px 0;">Loading...</p>';
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/brochures`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const brochures = await response.json();
    if (Array.isArray(brochures) && brochures.length > 0) {
      let html = '<table class="table"><thead><tr><th>University</th><th>Course</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
      brochures.forEach(b => {
        const uploadDate = new Date(b.uploadedAt).toLocaleDateString();
        const uploadedBy = b.uploadedBy ? b.uploadedBy.name : 'Unknown';
        html += `<tr>
          <td>${b.university}</td>
          <td>${b.course}</td>
          <td>${uploadedBy}</td>
          <td>${uploadDate}</td>
          <td>
            <button onclick="viewBrochurePDF('${b.filePath}')" class="btn btn-secondary" style="font-size:12px; padding:4px 8px;"><i class="fas fa-eye"></i> View</button>
            <button onclick="downloadBrochurePDF('${b.filePath}', '${b.university}-${b.course}-brochure.pdf')" class="btn btn-primary" style="font-size:12px; padding:4px 8px; margin-right:4px;"><i class="fas fa-download"></i> Download</button>
            <button onclick="deleteBrochure('${b._id}')" class="btn btn-danger" style="font-size:12px; padding:4px 8px; background:#dc2626;"><i class="fas fa-trash"></i> Delete</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
      listDiv.innerHTML = html;
    } else {
      listDiv.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px 0;">No brochures uploaded yet.</p>';
    }
  } catch (error) {
    listDiv.innerHTML = '<p style="color: #e11d48; text-align: center; padding: 20px 0;">Error loading brochures.</p>';
    console.error('Error loading brochures:', error);
  }
}

function viewBrochurePDF(filePath) {
  window.open(`${BASE_URL}/${filePath}`, '_blank');
}

function downloadBrochurePDF(filePath, fileName) {
  fetch(`${BASE_URL}/${filePath}`)
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch(error => {
      console.error('Download error:', error);
      showToast('Download Failed', 'Failed to download brochure', 'error');
    });
}

async function deleteBrochure(id) {
  showConfirmModal('Delete Brochure', 'Are you sure you want to delete this brochure?<br><br><small style="color: #ef4444;">⚠️ This action cannot be undone.</small>', async () => {
    try {
      showLoading('Deleting Brochure...', 'Please wait');
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/brochure/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      hideLoading();
      if (response.ok) {
        showBrochureMessage(data.message || 'Brochure deleted successfully', 'success');
        loadBrochuresAdmin();
      } else {
        showToast('Delete Failed', data.message || 'Delete failed', 'error');
      }
    } catch (error) {
      hideLoading();
      showToast('Error', 'An error occurred during delete', 'error');
      console.error('Brochure delete error:', error);
    }
  });
}

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
  
  // Auto-load dashboard statistics on page load
  loadOverallStats();
  
  // Start polling for updates from users
  startAdminUpdatePolling();
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
    case 'all-leads':
      targetId = 'all-leads-card';
      loadAllLeads(); // Load all leads when navigating to section
      break;
    case 'performance':
      targetId = 'overall-performance-card';
      break;
    case 'upload':
      targetId = 'upload-leads-card';
      break;
    case 'brochures':
      targetId = 'manage-brochures-card';
      loadBrochuresAdmin(); // Load brochures when navigating to section
      break;
    case 'settings':
      targetId = 'settings-card';
      loadUsers(); // Load users when navigating to settings
      break;
    case 'progress':
      targetId = 'user-progress-card';
      // Check if section needs to be expanded
      const progressBody = document.getElementById('user-progress-body');
      if (progressBody && progressBody.style.display === 'none') {
        shouldExpand = true;
        expandFunction = toggleUserProgress;
      }
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
let statusUserDistributionChart = null;
let currentStatusForDrillDown = null;
let currentStatusLeads = [];
let selectedUserIds = [];
let currentUserLeads = []; // store leads from selected user for client-side filtering
let globalSearchTimer = null;
let overallFilteredLeads = null; // store filtered leads from overall status distribution time range

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
  const confirmPassword = document.getElementById('new-user-confirm-password').value;
  
  // Validate passwords match
  if (password !== confirmPassword) {
    showCreateUserMessage('Passwords do not match', 'error');
    return;
  }
  
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
      setTimeout(() => closeCreateUserModal(), 1500); // Close modal after success
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
  const confirmPassword = document.getElementById('admin-confirm-password').value;
  
  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showAdminPasswordMessage('Passwords do not match', 'error');
    return;
  }
  
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
  
  // Show loading message for large files
  const fileSize = fileInput.files[0].size;
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  if (fileSizeMB > 5) {
    showMessage(`Uploading ${fileSizeMB}MB file... This may take a moment for large files.`, 'info');
  }
  
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
      if (data.failedCount && data.failedCount > 0) {
        extra += ` | Failed Validation: ${data.failedCount}`;
      }
      if (data.distributionText) {
        extra += ` | Distribution: ${data.distributionText}`;
      }
      
      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        console.error('Upload validation errors:', data.errors);
        extra += ` | Check console for error details.`;
      }
      
      showMessage(data.message + extra, data.failedCount > 0 ? 'info' : 'success');
      if (data.distribution && Array.isArray(data.distribution)) {
        renderDistributionGrid(data.distribution);
      }
      // Refresh entire dashboard to show new leads in charts and stats
      await refreshDashboard();
      // Do not reset selected users to allow repeated uploads
      fileInput.value = '';
    } else {
      showMessage(data.message || 'Upload failed', 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      showMessage('Upload failed. The file may be too large or the server timed out. Try uploading in smaller batches.', 'error');
    } else {
      showMessage('An error occurred during upload. Please check the file and try again.', 'error');
    }
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
    allUserLeadsData = null; // Reset cache
    return;
  }
  
  // Reset user leads data cache when switching users
  allUserLeadsData = null;
  
  // Reset date filter
  const filterSelect = document.getElementById('user-chart-date-filter');
  if (filterSelect) filterSelect.value = 'all';
  const customRange = document.getElementById('user-custom-date-range');
  if (customRange) customRange.style.display = 'none';
  
  try {
    const response = await apiCall(`/admin/user-progress/${userId}`);
    const data = await response.json();
    
    if (response.ok) {
      allUserLeadsData = data.leads; // Store for filtering
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
  
  // Create/Update Chart
  updateStatusChart(data.statusBreakdown, data.leads);
  
  // Display leads table
  renderUserLeadsTable(data.leads);
}

// Filter and search functionality for user leads
document.getElementById('user-lead-search').addEventListener('input', applyUserLeadsFilters);
document.getElementById('user-status-filter').addEventListener('change', applyUserLeadsFilters);

function applyUserLeadsFilters() {
  const searchTerm = document.getElementById('user-lead-search').value.toLowerCase();
  const statusFilter = document.getElementById('user-status-filter').value;
  
  let filteredLeads = currentUserLeads;
  
  // Apply status filter
  if (statusFilter) {
    filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
  }
  
  // Apply search filter
  if (searchTerm) {
    filteredLeads = filteredLeads.filter(lead => {
      return (
        (lead.name && lead.name.toLowerCase().includes(searchTerm)) ||
        (lead.contact && lead.contact.toLowerCase().includes(searchTerm)) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
        (lead.city && lead.city.toLowerCase().includes(searchTerm)) ||
        (lead.university && lead.university.toLowerCase().includes(searchTerm)) ||
        (lead.course && lead.course.toLowerCase().includes(searchTerm))
      );
    });
  }
  
  // Update table with pagination
  renderUserLeadsTable(filteredLeads);
}

// User Progress pagination variables
let userLeadsCurrentPage = 1;
let userLeadsPerPage = 25;
let filteredUserLeadsData = [];

function renderUserLeadsTable(leads) {
  const tbody = document.getElementById('leads-tbody');
  
  // Store filtered data for pagination
  filteredUserLeadsData = leads;
  
  // Update total stats
  const totalElem = document.getElementById('user-leads-total');
  if (totalElem) totalElem.textContent = filteredUserLeadsData.length;
  
  if (filteredUserLeadsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #9ca3af;">No leads found</td></tr>';
    updateUserPaginationControls();
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredUserLeadsData.length / userLeadsPerPage);
  const startIndex = (userLeadsCurrentPage - 1) * userLeadsPerPage;
  const endIndex = Math.min(startIndex + userLeadsPerPage, filteredUserLeadsData.length);
  const paginatedLeads = filteredUserLeadsData.slice(startIndex, endIndex);
  
  // Update showing stats
  const showingElem = document.getElementById('user-leads-showing');
  if (showingElem) showingElem.textContent = `${startIndex + 1}-${endIndex} of ${filteredUserLeadsData.length}`;
  
  tbody.innerHTML = '';
  
  paginatedLeads.forEach(lead => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => openLeadModal(lead.id);
    tr.innerHTML = `
      <td>${lead.name || ''}</td>
      <td>${lead.contact || ''}</td>
      <td>${lead.email || ''}</td>
      <td>${lead.city || 'N/A'}</td>
      <td>${lead.university || 'N/A'}</td>
      <td>${lead.course || 'N/A'}</td>
      <td>${lead.profession || 'N/A'}</td>
      <td>${lead.source || 'Other'}</td>
      <td><span class="lead-status status-${(lead.status||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}">${lead.status || ''}</span></td>
      <td>${lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : ''}</td>
    `;
    tbody.appendChild(tr);
  });
  
  // Update pagination controls
  updateUserPaginationControls();
}

// Update user pagination controls
function updateUserPaginationControls() {
  const totalPages = Math.ceil(filteredUserLeadsData.length / userLeadsPerPage);
  
  const currentPageElem = document.getElementById('user-current-page');
  const totalPagesElem = document.getElementById('user-total-pages');
  if (currentPageElem) currentPageElem.textContent = userLeadsCurrentPage;
  if (totalPagesElem) totalPagesElem.textContent = totalPages || 1;
  
  // Enable/disable buttons
  const firstBtn = document.getElementById('user-first-page-btn');
  const prevBtn = document.getElementById('user-prev-page-btn');
  const nextBtn = document.getElementById('user-next-page-btn');
  const lastBtn = document.getElementById('user-last-page-btn');
  
  if (firstBtn) firstBtn.disabled = userLeadsCurrentPage === 1;
  if (prevBtn) prevBtn.disabled = userLeadsCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = userLeadsCurrentPage >= totalPages;
  if (lastBtn) lastBtn.disabled = userLeadsCurrentPage >= totalPages;
}

// User pagination functions
function goToUserFirstPage() {
  userLeadsCurrentPage = 1;
  renderUserLeadsTable(filteredUserLeadsData);
}

function goToUserPrevPage() {
  if (userLeadsCurrentPage > 1) {
    userLeadsCurrentPage--;
    renderUserLeadsTable(filteredUserLeadsData);
  }
}

function goToUserNextPage() {
  const totalPages = Math.ceil(filteredUserLeadsData.length / userLeadsPerPage);
  if (userLeadsCurrentPage < totalPages) {
    userLeadsCurrentPage++;
    renderUserLeadsTable(filteredUserLeadsData);
  }
}

function goToUserLastPage() {
  const totalPages = Math.ceil(filteredUserLeadsData.length / userLeadsPerPage);
  userLeadsCurrentPage = totalPages;
  renderUserLeadsTable(filteredUserLeadsData);
}

function changeUserLeadsPerPage() {
  const select = document.getElementById('user-leads-per-page');
  userLeadsPerPage = parseInt(select.value);
  userLeadsCurrentPage = 1;
  renderUserLeadsTable(filteredUserLeadsData);
}

function clearUserLeadsFilter() {
  document.getElementById('user-lead-search').value = '';
  document.getElementById('user-status-filter').value = '';
  userLeadsCurrentPage = 1;
  renderUserLeadsTable(currentUserLeads);
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

// Helper function to refresh all dashboard data dynamically
async function refreshDashboard() {
  try {
    // Reload overall stats and charts
    await loadOverallStats();
    
    // Refresh user progress if a user is selected
    const selectedUser = document.getElementById('progress-user-select').value;
    if (selectedUser) {
      const resp = await apiCall(`/admin/user-progress/${selectedUser}`);
      const progData = await resp.json();
      if (resp.ok) displayUserProgress(progData);
    }
    
    // Refresh global search results if visible
    const searchInput = document.getElementById('global-lead-search');
    if (searchInput) {
      const q = searchInput.value.trim();
      if (q) await performGlobalSearch(q);
    }
    
    // Refresh all leads if that section is visible
    const allLeadsTable = document.getElementById('all-leads-tbody');
    if (allLeadsTable && allLeadsTable.children.length > 0) {
      await loadAllLeads();
    }
  } catch (error) {
    console.error('Error refreshing dashboard:', error);
  }
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
      
      // Reset filtered leads to null for initial "All Time" view
      overallFilteredLeads = null;
      
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
      animation: false,
      plugins: {
        barDataLabels: true,
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) { return context.parsed.y + ' leads'; }
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          grace: '5%',
          ticks: {
            maxTicksLimit: 8,
            callback: function(value) {
              // Format y-axis labels for readability
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
              }
              return value;
            }
          }
        }
      },
      onClick: async (evt, elements) => {
        if (!elements || elements.length === 0) return;
        const idx = elements[0].index;
        const status = labels[idx];
        await showStatusDistributionModal(status);
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
        <td>${lead.source || 'Other'}</td>
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

// Filtered Leads Graph Functions
let filteredLeadsChartInstance = null;
let currentFilteredLeadsData = []; // Store filtered leads for user distribution

// Custom plugin to display data labels on top of bars
const barDataLabelsPlugin = {
  id: 'barDataLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data, scales } = chart;
    const xScale = scales.x;
    const yScale = scales.y;
    
    data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value === undefined || value === null) return;
        
        // Get bar position
        const x = bar.x;
        const y = bar.y;
        
        // Set text properties
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Draw text above the bar
        ctx.fillText(value, x, y - 8);
      });
    });
  }
};

// Register plugin once globally for better performance
if (typeof Chart !== 'undefined') {
  Chart.register(barDataLabelsPlugin);
}

function closeFilteredLeadsGraphModal() {
  document.getElementById('filtered-leads-graph-modal').style.display = 'none';
  if (filteredLeadsChartInstance) {
    filteredLeadsChartInstance.destroy();
    filteredLeadsChartInstance = null;
  }
}

let filteredUserDistributionChartInstance = null;

function closeFilteredUserDistributionModal() {
  document.getElementById('filtered-user-distribution-modal').style.display = 'none';
  if (filteredUserDistributionChartInstance) {
    filteredUserDistributionChartInstance.destroy();
    filteredUserDistributionChartInstance = null;
  }
}

function showFilteredLeadsUserDistribution(status, sortedStatuses) {
  const existingModal = document.getElementById('filtered-user-distribution-modal');
  const isAlreadyOpen = existingModal && existingModal.style.display === 'flex';
  
  // If modal is already open, destroy the existing chart first
  if (isAlreadyOpen && filteredUserDistributionChartInstance) {
    filteredUserDistributionChartInstance.destroy();
    filteredUserDistributionChartInstance = null;
  }
  
  // Now create the new chart for the selected status
  openNewUserDistribution(status, sortedStatuses);
}

function openNewUserDistribution(status, sortedStatuses) {
  const statusLeads = currentFilteredLeadsData.filter(lead => (lead.status || 'Unknown') === status);
  
  if (statusLeads.length === 0) {
    alert('No leads found for this status.');
    return;
  }
  
  // Count leads by user
  const userCounts = {};
  statusLeads.forEach(lead => {
    const userName = lead.assignedTo && lead.assignedTo.name ? lead.assignedTo.name : 'Unassigned';
    userCounts[userName] = (userCounts[userName] || 0) + 1;
  });
  
  // Sort by count descending
  const sortedUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1]);
  
  // Prepare chart data
  const labels = sortedUsers.map(([user]) => user);
  const data = sortedUsers.map(([, count]) => count);
  
  // Define color for the status
  const statusColors = {
    'Fresh': '#6366f1',
    'Buffer fresh': '#8b5cf6',
    'Did not pick': '#ef4444',
    'Request call back': '#f97316',
    'Follow up': '#eab308',
    'Counselled': '#06b6d4',
    'Interested in next batch': '#3b82f6',
    'Registration fees paid': '#10b981',
    'Enrolled': '#8b5cf6',
    'Junk/not interested': '#64748b',
    'Unknown': '#9ca3af'
  };
  
  const backgroundColor = statusColors[status] || '#6366f1';
  
  // Show modal
  document.getElementById('filtered-user-distribution-modal').style.display = 'flex';
  document.getElementById('filtered-user-dist-title').textContent = `User Distribution - ${status}`;
  
  // Destroy existing chart if any
  if (filteredUserDistributionChartInstance) {
    filteredUserDistributionChartInstance.destroy();
  }
  
  // Create new chart
  const ctx = document.getElementById('filtered-user-distribution-chart');
  if (!ctx) return;
  
  filteredUserDistributionChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Leads',
        data: data,
        backgroundColor: backgroundColor,
        borderColor: backgroundColor,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        barDataLabels: true,
        legend: {
          display: true,
          position: 'top',
          labels: {
            padding: 15,
            font: {
              size: 13,
              weight: '500'
            },
            color: '#4b5563'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${value} leads (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grace: '5%',
          grid: {
            color: '#f3f4f6'
          },
          ticks: {
            font: { size: 12 },
            color: '#6b7280'
          }
        },
        x: {
          ticks: {
            font: { size: 12 },
            color: '#4b5563',
            padding: 8
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
  
  // Update summary statistics
  updateFilteredUserDistributionSummary(status, sortedUsers);
}

function updateFilteredUserDistributionSummary(status, sortedUsers) {
  const statsDiv = document.getElementById('filtered-user-dist-stats');
  statsDiv.innerHTML = '';
  
  const total = sortedUsers.reduce((sum, [, count]) => sum + count, 0);
  const topUser = sortedUsers[0];
  
  // Add total leads stat
  const totalDiv = document.createElement('div');
  totalDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;';
  totalDiv.innerHTML = `
    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Leads</div>
    <div style="font-size: 20px; font-weight: 700; color: #1f2937;">${total}</div>
  `;
  statsDiv.appendChild(totalDiv);
  
  // Add top user stat
  if (topUser) {
    const topDiv = document.createElement('div');
    topDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;';
    topDiv.innerHTML = `
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Assigned Most</div>
      <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${topUser[0]}</div>
      <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${topUser[1]} leads (${((topUser[1] / total) * 100).toFixed(1)}%)</div>
    `;
    statsDiv.appendChild(topDiv);
  }
  
  // Add user breakdown
  sortedUsers.slice(0, 3).forEach(([user, count]) => {
    const userDiv = document.createElement('div');
    userDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;';
    const percentage = ((count / total) * 100).toFixed(1);
    userDiv.innerHTML = `
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${user}</div>
      <div style="font-size: 18px; font-weight: 700; color: #1f2937;">${count}</div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">${percentage}% of total</div>
    `;
    statsDiv.appendChild(userDiv);
  });
}

function showFilteredLeadsGraph() {
  // Get currently filtered leads
  if (!filteredLeadsData || filteredLeadsData.length === 0) {
    alert('No leads to display. Please check your filters.');
    return;
  }
  
  // Store filtered leads for user distribution
  currentFilteredLeadsData = [...filteredLeadsData];

  // Count leads by status
  const statusCounts = {};
  filteredLeadsData.forEach(lead => {
    const status = lead.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Sort by count descending
  const sortedStatuses = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1]);

  // Prepare chart data
  const labels = sortedStatuses.map(([status]) => status);
  const data = sortedStatuses.map(([, count]) => count);

  // Define colors for each status
  const statusColors = {
    'Fresh': '#6366f1',
    'Buffer fresh': '#8b5cf6',
    'Did not pick': '#ef4444',
    'Request call back': '#f97316',
    'Follow up': '#eab308',
    'Counselled': '#06b6d4',
    'Interested in next batch': '#3b82f6',
    'Registration fees paid': '#10b981',
    'Enrolled': '#8b5cf6',
    'Junk/not interested': '#64748b',
    'Unknown': '#9ca3af'
  };

  const backgroundColors = labels.map(label => statusColors[label] || '#6366f1');

  // Show modal
  document.getElementById('filtered-leads-graph-modal').style.display = 'flex';

  // Destroy existing chart if any
  if (filteredLeadsChartInstance) {
    filteredLeadsChartInstance.destroy();
  }

  // Create new chart
  const ctx = document.getElementById('filtered-leads-chart');
  if (!ctx) return;

  filteredLeadsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Leads',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        barDataLabels: true,
        legend: {
          display: true,
          position: 'top',
          labels: {
            padding: 15,
            font: {
              size: 13,
              weight: '500'
            },
            color: '#4b5563'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${value} leads (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grace: '5%',
          grid: {
            color: '#f3f4f6'
          },
          ticks: {
            font: { size: 12 },
            color: '#6b7280'
          }
        },
        y: {
          ticks: {
            font: { size: 12 },
            color: '#4b5563',
            padding: 8
          },
          grid: {
            display: false
          }
        }
      },
      onClick: (evt, elements) => {
        if (!elements || elements.length === 0) return;
        const idx = elements[0].index;
        const status = labels[idx];
        showFilteredLeadsUserDistribution(status, sortedStatuses);
      }
    }
  });

  // Update summary statistics
  updateGraphSummary(filteredLeadsData, sortedStatuses);
}

function updateGraphSummary(leads, sortedStatuses) {
  const statsDiv = document.getElementById('graph-stats');
  statsDiv.innerHTML = '';

  const total = leads.length;
  const topStatus = sortedStatuses[0];
  
  // Add total leads stat
  const totalDiv = document.createElement('div');
  totalDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;';
  totalDiv.innerHTML = `
    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Leads</div>
    <div style="font-size: 20px; font-weight: 700; color: #1f2937;">${total}</div>
  `;
  statsDiv.appendChild(totalDiv);

  // Add top status stat
  if (topStatus) {
    const topDiv = document.createElement('div');
    topDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;';
    topDiv.innerHTML = `
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Most Common</div>
      <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${topStatus[0]}</div>
      <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${topStatus[1]} leads (${((topStatus[1] / total) * 100).toFixed(1)}%)</div>
    `;
    statsDiv.appendChild(topDiv);
  }

  // Add status breakdown
  sortedStatuses.slice(0, 4).forEach(([status, count]) => {
    const statDiv = document.createElement('div');
    statDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;';
    const percentage = ((count / total) * 100).toFixed(1);
    statDiv.innerHTML = `
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${status}</div>
      <div style="font-size: 18px; font-weight: 700; color: #1f2937;">${count}</div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">${percentage}% of total</div>
    `;
    statsDiv.appendChild(statDiv);
  });
}

// New drill-down modal functions
async function showStatusDistributionModal(status) {
  try {
    const modal = document.getElementById('status-distribution-modal');
    if (!modal) return;

    // Use filtered leads if available, otherwise fetch all leads
    let allLeads;
    if (overallFilteredLeads && overallFilteredLeads.length > 0) {
      allLeads = overallFilteredLeads;
    } else {
      const response = await apiCall('/admin/all-leads');
      const data = await response.json();
      if (!response.ok) return;
      allLeads = data.leads;
    }

    // Filter leads by status
    const leads = allLeads.filter(l => l.status === status);
    currentStatusForDrillDown = status;
    currentStatusLeads = leads;

    // Update modal title
    document.getElementById('status-distribution-title').textContent = `${status} - User Distribution`;
    document.getElementById('status-distribution-subtitle').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''} with status "${status}"`;

    // Build user distribution data
    const userCounts = {};
    leads.forEach(lead => {
      const userName = lead.assignedTo && lead.assignedTo.name ? lead.assignedTo.name : 'Unassigned';
      const userId = lead.assignedTo && lead.assignedTo._id ? lead.assignedTo._id : 'unassigned';
      if (!userCounts[userId]) {
        userCounts[userId] = { name: userName, count: 0, id: userId };
      }
      userCounts[userId].count++;
    });

    const userStats = Object.values(userCounts);
    createStatusUserDistributionChart(userStats, status);

    // Populate the all-leads table
    populateStatusDistributionTable(leads);

    // Reset table visibility
    document.getElementById('status-distribution-table-section').style.display = 'none';
    document.getElementById('toggle-status-table-btn').innerHTML = '<i class="fas fa-table"></i> Show All Leads Table';

    // Show modal
    document.body.style.overflow = 'hidden';
    modal.style.display = 'flex';
    modal.onclick = (e) => {
      if (e.target === modal) closeStatusDistributionModal();
    };
  } catch (err) {
    console.error('Error showing status distribution modal', err);
  }
}

function createStatusUserDistributionChart(userStats, status) {
  const ctx = document.getElementById('statusUserDistributionChart');
  if (!ctx) return;

  const labels = userStats.map(u => u.name);
  const data = userStats.map(u => u.count);
  const userIds = userStats.map(u => u.id);

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

  const backgroundColor = colors[status] || '#667eea';

  if (statusUserDistributionChart) {
    statusUserDistributionChart.destroy();
  }

  statusUserDistributionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Leads',
        data: data,
        backgroundColor: backgroundColor,
        borderWidth: 1,
        borderColor: backgroundColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      plugins: {
        barDataLabels: true,
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) { return context.parsed.y + ' leads'; }
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          grace: '5%',
          ticks: {
            callback: function(value) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              else if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
              return value;
            }
          }
        }
      },
      onClick: async (evt, elements) => {
        if (!elements || elements.length === 0) return;
        const idx = elements[0].index;
        const userId = userIds[idx];
        const userName = labels[idx];
        await showUserStatusLeadsTable(status, userId, userName);
      }
    }
  });
}

async function showUserStatusLeadsTable(status, userId, userName) {
  // Filter current status leads by user
  const leads = currentStatusLeads.filter(lead => {
    const leadUserId = lead.assignedTo && lead.assignedTo._id ? lead.assignedTo._id : 'unassigned';
    return leadUserId === userId;
  });

  // Show the existing status-leads-modal with filtered data
  const modal = document.getElementById('status-leads-modal');
  if (!modal) return;

  document.getElementById('status-leads-title').textContent = `${status} - ${userName}`;
  document.getElementById('status-leads-count').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''} for ${userName} with status "${status}"`;

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
      <td>${lead.source || 'Other'}</td>
      <td><span class="lead-status status-${(lead.status||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}">${lead.status}</span></td>
      <td>${lead.assignedTo && lead.assignedTo.name ? lead.assignedTo.name : 'Unassigned'}</td>
      <td>${lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : ''}</td>`;
    tr.addEventListener('click', () => {
      openLeadModal(lead._id || lead.id);
    });
    tbody.appendChild(tr);
  });

  document.body.style.overflow = 'hidden';
  modal.style.display = 'flex';
  // Don't close distribution modal when closing this modal
  modal.onclick = (e) => {
    if (e.target === modal) closeStatusLeadsModal();
  };
}

function populateStatusDistributionTable(leads) {
  const tbody = document.getElementById('status-distribution-all-leads-tbody');
  tbody.innerHTML = '';
  
  leads.forEach(lead => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.name || ''}</td>
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.contact || ''}</td>
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.email || ''}</td>
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.city || ''}</td>
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.university || ''}</td>
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.course || ''}</td>
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.assignedTo && lead.assignedTo.name ? lead.assignedTo.name : 'Unassigned'}</td>
      <td style="padding: 10px 20px; white-space: nowrap;">${lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : ''}</td>`;
    tr.addEventListener('click', () => {
      closeStatusDistributionModal();
      openLeadModal(lead._id || lead.id);
    });
    tbody.appendChild(tr);
  });
}

function toggleStatusDistributionTable() {
  const tableSection = document.getElementById('status-distribution-table-section');
  const btn = document.getElementById('toggle-status-table-btn');
  
  if (tableSection.style.display === 'none') {
    tableSection.style.display = 'block';
    btn.innerHTML = '<i class="fas fa-table"></i> Hide All Leads Table';
  } else {
    tableSection.style.display = 'none';
    btn.innerHTML = '<i class="fas fa-table"></i> Show All Leads Table';
  }
}

function closeStatusDistributionModal() {
  const modal = document.getElementById('status-distribution-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
  modal.onclick = null;
  
  // Destroy chart to free memory
  if (statusUserDistributionChart) {
    statusUserDistributionChart.destroy();
    statusUserDistributionChart = null;
  }
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
      animation: false,
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
          grace: '5%',
          ticks: {
            callback: function(value) {
              // Format y-axis labels for readability
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
              }
              return value;
            }
          }
        }
      },
      onClick: async (evt, elements) => {
        if (!elements || elements.length === 0) return;
        const idx = elements[0].index;
        const userId = userStats[idx].userId;
        const userName = userStats[idx].userName;
        if (!userId) return;
        // Navigate to User Progress section and show this user's details
        showSection('progress');
        const selectElement = document.getElementById('progress-user-select');
        selectElement.value = userId;
        // Trigger the change event to load user progress
        selectElement.dispatchEvent(new Event('change'));
      }
    }
  });
}

function updateStatusChart(statusBreakdown, allLeads) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  
  const labels = Object.keys(statusBreakdown);
  const data = Object.values(statusBreakdown);
  
  // Store leads for filtering
  currentUserLeads = allLeads || currentUserLeads;
  
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
      animation: false,
      plugins: {
        barDataLabels: true,
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
          grace: '5%',
          ticks: {
            callback: function(value) {
              // Format y-axis labels for readability
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k';
              }
              return value;
            }
          }
        }
      },
      onClick: (evt, elements) => {
        if (!elements || elements.length === 0) return;
        const idx = elements[0].index;
        const status = labels[idx];
        filterLeadsByStatus(status);
      }
    }
  });
}

function filterLeadsByStatus(status) {
  const filteredLeads = currentUserLeads.filter(lead => lead.status === status);
  
  // Set status filter dropdown and clear search
  document.getElementById('user-status-filter').value = status;
  document.getElementById('user-lead-search').value = '';
  
  // Update table with filtered leads
  renderUserLeadsTable(filteredLeads);
  
  // Scroll to table
  document.getElementById('leads-table-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    document.getElementById('admin-modal-lead-university').value = data.university || '';
    document.getElementById('admin-modal-lead-course').value = data.course || '';
    document.getElementById('admin-modal-lead-profession').textContent = data.profession || 'N/A';
    document.getElementById('admin-modal-lead-source').textContent = data.source || 'Other';
    document.getElementById('admin-modal-lead-status').textContent = data.status;

    // Clear quick update fields
    document.getElementById('admin-quick-status').value = '';
    document.getElementById('admin-quick-note').value = '';
    document.getElementById('admin-quick-datetime').value = '';
    
    // Clear transfer field
    const transferUserSelect = document.getElementById('transfer-user-select');
    if (transferUserSelect) {
      transferUserSelect.value = '';
    }
    
    // Display next call date if exists
    if (data.nextCallDateTime) {
      const date = new Date(data.nextCallDateTime);
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      document.getElementById('admin-quick-datetime').value = localDateTime;
    }

    // Display unified timeline (includes status, notes, and assignment history)
    displayAdminTimeline(data);

    document.getElementById('admin-lead-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error loading lead detail', err);
  }
}

function displayAdminTimeline(data) {
  const container = document.getElementById('admin-timeline-container');
  container.innerHTML = '';
  
  const timeline = [];
  
  // Add status history
  if (data.statusHistory && data.statusHistory.length > 0) {
    data.statusHistory.forEach(entry => {
      timeline.push({
        type: 'status',
        content: entry.status,
        date: new Date(entry.changedAt),
        dateStr: entry.changedAt,
        changedBy: entry.changedBy
      });
    });
  }
  
  // Add notes
  if (data.notes && data.notes.length > 0) {
    data.notes.forEach(note => {
      timeline.push({
        type: 'note',
        content: note.content,
        date: new Date(note.createdAt),
        dateStr: note.createdAt,
        changedBy: note.createdBy
      });
    });
  }
  
  // Add assignment history
  if (data.assignmentHistory && data.assignmentHistory.length > 0) {
    data.assignmentHistory.forEach(entry => {
      const fromName = entry.fromUser ? entry.fromUser.name : 'None';
      const toName = entry.toUser ? entry.toUser.name : 'Unknown';
      timeline.push({
        type: 'assignment',
        content: `${entry.action}: ${fromName} → ${toName}`,
        action: entry.action,
        fromUser: entry.fromUser,
        toUser: entry.toUser,
        date: new Date(entry.changedAt),
        dateStr: entry.changedAt,
        changedBy: entry.changedBy
      });
    });
  }
  
  if (timeline.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No activity yet</p>';
    return;
  }
  
  // Sort by date (newest first)
  timeline.sort((a, b) => b.date - a.date);
  
  // Helper to get "by" text
  const getByText = (changedBy) => {
    if (!changedBy) return '';
    const name = changedBy.name || 'Unknown';
    const role = changedBy.role === 'admin' ? 'Admin' : 'User';
    return `<span style="font-size: 10px; color: #9ca3af; margin-left: 6px;">by ${role}: ${name}</span>`;
  };
  
  timeline.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'note-item';
    
    if (entry.type === 'status') {
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="note-content" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <i class="fas fa-exchange-alt" style="color: #6366f1;"></i>
            <strong>Status:</strong> 
            <span class="lead-status status-${(entry.content||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}">${entry.content}</span>
            ${getByText(entry.changedBy)}
          </div>
          <div class="note-date" style="white-space: nowrap;">${entry.date.toLocaleString()}</div>
        </div>
      `;
    } else if (entry.type === 'assignment') {
      const fromName = entry.fromUser ? entry.fromUser.name : 'None';
      const toName = entry.toUser ? entry.toUser.name : 'Unknown';
      const actionLabel = entry.action === 'assigned' ? 'Assigned' : entry.action === 'transferred' ? 'Transferred' : entry.action === 'distributed' ? 'Distributed' : entry.action;
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="note-content" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <i class="fas fa-user-friends" style="color: #8b5cf6;"></i>
            <strong>${actionLabel}:</strong> ${fromName} → ${toName}
            ${getByText(entry.changedBy)}
          </div>
          <div class="note-date" style="white-space: nowrap;">${entry.date.toLocaleString()}</div>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="note-content" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <i class="fas fa-comment-dots" style="color: #10b981; margin-top: 2px;"></i>
            <span>${entry.content}</span>
            ${getByText(entry.changedBy)}
          </div>
          <div class="note-date" style="white-space: nowrap;">${entry.date.toLocaleString()}</div>
        </div>
      `;
    }
    
    container.appendChild(item);
  });
}

// Clear scheduled call for admin lead popup
async function clearAdminSchedule() {
  if (!currentLeadId) {
    showTransferMessage('No lead selected', 'error');
    return;
  }
  
  try {
    const response = await apiCall(`/admin/lead/${currentLeadId}`, {
      method: 'PUT',
      body: JSON.stringify({ nextCallDateTime: null })
    });
    
    if (response.ok) {
      document.getElementById('admin-quick-datetime').value = '';
      showTransferMessage('Schedule cleared successfully', 'success');
      await loadAllLeads();
      adminLastCheckTimestamp = Date.now();
    } else {
      const data = await response.json();
      showTransferMessage(data.message || 'Failed to clear schedule', 'error');
    }
  } catch (error) {
    console.error('Error clearing schedule:', error);
    showTransferMessage('Error clearing schedule', 'error');
  }
}

async function quickUpdateAdminLead() {
  if (!currentLeadId) return;
  
  const newStatus = document.getElementById('admin-quick-status').value;
  const noteContent = document.getElementById('admin-quick-note').value.trim();
  const dateTimeValue = document.getElementById('admin-quick-datetime').value;
  const newUserId = document.getElementById('transfer-user-select').value;
  
  // Validate that at least one field is being updated
  if (!newStatus && !noteContent && !dateTimeValue && !newUserId) {
    showTransferMessage('Please update at least one field (status, note, schedule, or transfer)', 'error');
    return;
  }
  
  // Validate future date if provided
  if (dateTimeValue) {
    const followUpDate = new Date(dateTimeValue);
    const now = new Date();
    if (followUpDate <= now) {
      showTransferMessage('Follow-up time must be in the future', 'error');
      return;
    }
  }
  
  try {
    let updateSuccess = false;
    let transferSuccess = false;
    const updates = [];
    
    // First, update lead details if any are provided
    if (newStatus || noteContent || dateTimeValue) {
      const updateData = {};
      if (newStatus) {
        updateData.status = newStatus;
        updates.push('status');
      }
      if (noteContent) {
        updateData.note = noteContent;
        updates.push('note');
      }
      if (dateTimeValue) {
        updateData.nextCallDateTime = new Date(dateTimeValue).toISOString();
        updates.push('schedule');
      }
      
      const response = await apiCall(`/admin/lead/${currentLeadId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        updateSuccess = true;
      } else {
        const data = await response.json();
        showTransferMessage(data.message || 'Update failed', 'error');
        return;
      }
    }
    
    // Then, transfer lead if user is selected
    if (newUserId) {
      // Check if transfer is to same user
      const leadResp = await apiCall(`/admin/lead/${currentLeadId}`);
      const leadData = await leadResp.json();
      if (leadResp.ok && leadData.assignedTo && leadData.assignedTo._id === newUserId) {
        showTransferMessage('Lead is already assigned to this user', 'error');
        return;
      }

      const transferData = { newUserId };

      const response = await apiCall(`/admin/transfer-lead/${currentLeadId}`, {
        method: 'PATCH',
        body: JSON.stringify(transferData)
      });
      
      if (response.ok) {
        transferSuccess = true;
        updates.push('transferred');
      } else {
        const data = await response.json();
        showTransferMessage(data.message || 'Transfer failed', 'error');
        return;
      }
    }
    
    // If we got here, everything succeeded
    if (updateSuccess || transferSuccess) {
      // Clear form fields
      document.getElementById('admin-quick-status').value = '';
      document.getElementById('admin-quick-note').value = '';
      document.getElementById('transfer-user-select').value = '';
      
      showTransferMessage(`Lead updated successfully! (${updates.join(', ')})`, 'success');
      
      // Close the modal after successful update
      setTimeout(() => {
        closeAdminLeadModal();
      }, 1000);
      
      // Refresh entire dashboard dynamically
      await refreshDashboard();
    } else {
      showTransferMessage(data.message || 'Failed to update lead', 'error');
    }
  } catch (error) {
    console.error('Error updating lead:', error);
    showTransferMessage('Failed to update lead', 'error');
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
      // Refresh entire dashboard dynamically
      await refreshDashboard();
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

// Copy lead details to clipboard (Admin)
function copyAdminLeadDetails() {
  if (!currentLeadId) return;
  
  const name = document.getElementById('admin-modal-lead-name').textContent;
  const contact = document.getElementById('admin-modal-lead-contact').textContent;
  const email = document.getElementById('admin-modal-lead-email').textContent;
  const university = document.getElementById('admin-modal-lead-university').value;
  const course = document.getElementById('admin-modal-lead-course').value;
  
  const details = `Name: ${name}
Contact: ${contact}
Email: ${email}
University: ${university}
Course: ${course}`;
  
  navigator.clipboard.writeText(details).then(() => {
    showTransferMessage('Lead details copied to clipboard', 'success');
    setTimeout(() => {
      const transferMsg = document.getElementById('transfer-message');
      transferMsg.style.display = 'none';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    showTransferMessage('Failed to copy to clipboard', 'error');
  });
}

// Update lead field (university or course) - Admin
async function updateAdminLeadField(field) {
  if (!currentLeadId) return;
  
  const value = document.getElementById(`admin-modal-lead-${field}`).value.trim();
  
  if (!value) {
    showTransferMessage(`Please enter a ${field}`, 'error');
    return;
  }
  
  try {
    const updateData = {};
    updateData[field] = value;
    
    const response = await apiCall(`/admin/lead/${currentLeadId}/field`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showTransferMessage(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`, 'success');
      
      // Refresh the lead modal
      await openLeadModal(currentLeadId);
      
      // Refresh entire dashboard dynamically
      await refreshDashboard();
    } else {
      showTransferMessage(data.message || 'Failed to update', 'error');
    }
  } catch (error) {
    console.error('Error updating field:', error);
    showTransferMessage('Failed to update', 'error');
  }
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
      // Refresh entire dashboard to update statistics and charts
      await refreshDashboard();
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

// Global escape key handler for all modals (duplicate removed - using the one at top of file)

async function transferLead() {
  if (!currentLeadId) return;
  const newUserId = document.getElementById('transfer-user-select').value;
  const transferNote = document.getElementById('transfer-note').value.trim();
  
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

    const transferData = { newUserId };
    if (transferNote) {
      transferData.note = transferNote;
    }

    const response = await apiCall(`/admin/transfer-lead/${currentLeadId}`, {
      method: 'PATCH',
      body: JSON.stringify(transferData)
    });
    const data = await response.json();
    if (response.ok) {
      showTransferMessage('Lead transferred successfully' + (transferNote ? ' with note' : ''), 'success');
      // Clear the transfer note field
      document.getElementById('transfer-note').value = '';
      // Refresh modal content to reflect updated assignment history
      await openLeadModal(currentLeadId);
      // Refresh entire dashboard dynamically
      await refreshDashboard();
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

// ============ Date Filter Functions ============

// Store all leads data for filtering
let allLeadsData = null;
let allUserLeadsData = null;

// Multi-select filter arrays
let selectedStatusFilters = [];
let selectedUserFilters = [];
let selectedSourceFilters = [];
let selectedUniversityFilters = [];
let selectedTransferUserIds = [];

// Date range calculation helper
function getDateRange(filterValue, customStart = null, customEnd = null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch(filterValue) {
    case 'today':
      return { start: today, end: new Date() };
    
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay()); // Start of week (Sunday)
      return { start: weekStart, end: new Date() };
    
    case '15days':
      const days15 = new Date(today);
      days15.setDate(days15.getDate() - 15);
      return { start: days15, end: new Date() };
    
    case '30days':
      const days30 = new Date(today);
      days30.setDate(days30.getDate() - 30);
      return { start: days30, end: new Date() };
    
    case 'custom':
      if (customStart && customEnd) {
        return { start: new Date(customStart), end: new Date(customEnd + 'T23:59:59') };
      }
      return null;
    
    case 'all':
    default:
      return null;
  }
}

// Filter leads by date range
function filterLeadsByDateRange(leads, dateRange) {
  if (!dateRange) return leads;
  
  return leads.filter(lead => {
    const leadDate = new Date(lead.updatedAt || lead.createdAt);
    return leadDate >= dateRange.start && leadDate <= dateRange.end;
  });
}

// Overall chart date filter
document.addEventListener('DOMContentLoaded', () => {
  const overallFilter = document.getElementById('overall-chart-date-filter');
  if (overallFilter) {
    overallFilter.addEventListener('change', function() {
      const customRange = document.getElementById('overall-custom-date-range');
      if (this.value === 'custom') {
        customRange.style.display = 'flex';
      } else {
        customRange.style.display = 'none';
        applyOverallDateFilter(this.value);
      }
    });
  }
  
  const userFilter = document.getElementById('user-chart-date-filter');
  if (userFilter) {
    userFilter.addEventListener('change', function() {
      const customRange = document.getElementById('user-custom-date-range');
      if (this.value === 'custom') {
        customRange.style.display = 'flex';
      } else {
        customRange.style.display = 'none';
        applyUserDateFilter(this.value);
      }
    });
  }
});

async function applyOverallDateFilter(filterValue) {
  try {
    // Fetch all leads if not already loaded
    if (!allLeadsData) {
      const response = await apiCall('/admin/all-leads');
      const data = await response.json();
      if (response.ok && data.leads) {
        allLeadsData = data.leads;
      } else {
        return;
      }
    }
    
    const dateRange = getDateRange(filterValue);
    const filteredLeads = filterLeadsByDateRange(allLeadsData, dateRange);
    
    // Store filtered leads globally for use in drill-down modals
    overallFilteredLeads = filteredLeads;
    
    // Calculate status breakdown
    const statusBreakdown = {};
    filteredLeads.forEach(lead => {
      const status = lead.status || 'Unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    // Update chart
    createOverallStatusChart(statusBreakdown);
  } catch (error) {
    console.error('Error applying date filter:', error);
  }
}

function applyOverallCustomDateFilter() {
  const startDate = document.getElementById('overall-start-date').value;
  const endDate = document.getElementById('overall-end-date').value;
  
  if (!startDate || !endDate) {
    showToast('Date Required', 'Please select both start and end dates', 'warning');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    showToast('Invalid Date Range', 'Start date must be before end date', 'warning');
    return;
  }
  
  applyOverallDateFilterCustom(startDate, endDate);
}

async function applyOverallDateFilterCustom(startDate, endDate) {
  try {
    if (!allLeadsData) {
      const response = await apiCall('/admin/all-leads');
      const data = await response.json();
      if (response.ok && data.leads) {
        allLeadsData = data.leads;
      } else {
        return;
      }
    }
    
    const dateRange = getDateRange('custom', startDate, endDate);
    const filteredLeads = filterLeadsByDateRange(allLeadsData, dateRange);
    
    // Store filtered leads globally for use in drill-down modals
    overallFilteredLeads = filteredLeads;
    
    const statusBreakdown = {};
    filteredLeads.forEach(lead => {
      const status = lead.status || 'Unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    createOverallStatusChart(statusBreakdown);
  } catch (error) {
    console.error('Error applying custom date filter:', error);
  }
}

// User progress chart date filter
async function applyUserDateFilter(filterValue) {
  const userId = document.getElementById('progress-user-select').value;
  if (!userId) return;
  
  try {
    if (!allUserLeadsData) {
      const response = await apiCall(`/admin/user-progress/${userId}`);
      const data = await response.json();
      if (response.ok && data.leads) {
        allUserLeadsData = data.leads;
      } else {
        return;
      }
    }
    
    const dateRange = getDateRange(filterValue);
    const filteredLeads = filterLeadsByDateRange(allUserLeadsData, dateRange);
    
    const statusBreakdown = {};
    filteredLeads.forEach(lead => {
      const status = lead.status || 'Unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    updateStatusChart(statusBreakdown);
  } catch (error) {
    console.error('Error applying user date filter:', error);
  }
}

function applyUserCustomDateFilter() {
  const startDate = document.getElementById('user-start-date').value;
  const endDate = document.getElementById('user-end-date').value;
  
  if (!startDate || !endDate) {
    showToast('Date Required', 'Please select both start and end dates', 'warning');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    showToast('Invalid Date Range', 'Start date must be before end date', 'warning');
    return;
  }
  
  applyUserDateFilterCustom(startDate, endDate);
}

async function applyUserDateFilterCustom(startDate, endDate) {
  const userId = document.getElementById('progress-user-select').value;
  if (!userId) return;
  
  try {
    if (!allUserLeadsData) {
      const response = await apiCall(`/admin/user-progress/${userId}`);
      const data = await response.json();
      if (response.ok && data.leads) {
        allUserLeadsData = data.leads;
      } else {
        return;
      }
    }
    
    const dateRange = getDateRange('custom', startDate, endDate);
    const filteredLeads = filterLeadsByDateRange(allUserLeadsData, dateRange);
    
    const statusBreakdown = {};
    filteredLeads.forEach(lead => {
      const status = lead.status || 'Unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });
    
    updateStatusChart(statusBreakdown);
  } catch (error) {
    console.error('Error applying custom user date filter:', error);
  }
}

// ===== ALL LEADS MANAGEMENT =====
let selectedLeadIds = [];
let currentPage = 1;
let leadsPerPage = 25;
let filteredLeadsData = [];
let transitionFilterActive = false;
let transitionFilterConfig = {
  fromStatus: '',
  toStatus: '',
  dateFilter: 'all',
  startDate: null,
  endDate: null
};
let noActionFilterActive = false;
let noActionFilterConfig = {
  days: 7,
  startDate: null,
  endDate: null
};
let transferFilterActive = false;
let transferFilterConfig = {
  fromUser: '',
  toUser: '',
  dateFilter: 'all',
  startDate: null,
  endDate: null
};

// Toggle transition filter panel
function toggleTransitionFilter() {
  const panel = document.getElementById('transition-filter-panel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

// Handle transition date filter dropdown change
function handleTransitionDateFilter() {
  const dateFilter = document.getElementById('transition-date-filter').value;
  const customDates = document.getElementById('transition-custom-dates');
  
  if (dateFilter === 'custom') {
    customDates.style.display = 'flex';
  } else {
    customDates.style.display = 'none';
  }
}

// Clear transition filter
function clearTransitionFilter() {
  document.getElementById('transition-from-status').value = '';
  document.getElementById('transition-to-status').value = '';
  document.getElementById('transition-date-filter').value = 'all';
  document.getElementById('transition-start-date').value = '';
  document.getElementById('transition-end-date').value = '';
  document.getElementById('transition-custom-dates').style.display = 'none';
  
  transitionFilterActive = false;
  transitionFilterConfig = {
    fromStatus: '',
    toStatus: '',
    dateFilter: 'all',
    startDate: null,
    endDate: null
  };
  
  document.getElementById('transition-filter-status').innerHTML = '<i class="fas fa-info-circle"></i> Select status transition and time period, then click Apply.';
  
  // Close the filter panel
  toggleTransitionFilter();
  
  // Re-render leads without transition filter
  renderAllLeads();
}

// Apply transition filter
function applyTransitionFilter() {
  const fromStatus = document.getElementById('transition-from-status').value;
  const toStatus = document.getElementById('transition-to-status').value;
  const dateFilter = document.getElementById('transition-date-filter').value;
  
  if (!fromStatus && !toStatus) {
    showToast('Invalid Filter', 'Please select at least one status (From or To)', 'warning');
    return;
  }
  
  transitionFilterConfig = {
    fromStatus: fromStatus,
    toStatus: toStatus,
    dateFilter: dateFilter,
    startDate: null,
    endDate: null
  };
  
  if (dateFilter === 'custom') {
    const startDate = document.getElementById('transition-start-date').value;
    const endDate = document.getElementById('transition-end-date').value;
    
    if (!startDate || !endDate) {
      showToast('Date Required', 'Please select both start and end dates', 'warning');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      showToast('Invalid Date Range', 'Start date must be before end date', 'warning');
      return;
    }
    
    transitionFilterConfig.startDate = startDate;
    transitionFilterConfig.endDate = endDate;
  }
  
  transitionFilterActive = true;
  
  // Update status message
  let statusMsg = '<i class="fas fa-check-circle"></i> <strong>Active Filter:</strong> ';
  if (fromStatus && toStatus) {
    statusMsg += `${fromStatus} → ${toStatus}`;
  } else if (fromStatus) {
    statusMsg += `From ${fromStatus} to any status`;
  } else if (toStatus) {
    statusMsg += `Any status → ${toStatus}`;
  }
  
  if (dateFilter !== 'all') {
    const filterLabels = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'week': 'This Week',
      '15days': 'Last 15 Days',
      '30days': 'Last 30 Days',
      'custom': `${transitionFilterConfig.startDate} to ${transitionFilterConfig.endDate}`
    };
    statusMsg += ` (${filterLabels[dateFilter]})`;
  }
  
  document.getElementById('transition-filter-status').innerHTML = statusMsg;
  
  // Re-render leads with transition filter
  showLoading('Applying Filter...', 'Searching for status transitions...');
  setTimeout(() => {
    renderAllLeads();
    hideLoading();
    showToast('Filter Applied', 'Status transition filter is now active', 'success');
  }, 300);
}

// Quick transition presets
function applyQuickTransition(fromStatus, toStatus) {
  document.getElementById('transition-from-status').value = fromStatus;
  document.getElementById('transition-to-status').value = toStatus;
  document.getElementById('transition-date-filter').value = 'all';
  document.getElementById('transition-custom-dates').style.display = 'none';
  
  // Auto-apply the filter
  applyTransitionFilter();
}

// ===== NO ACTION FILTER =====

// Toggle no action filter panel
function toggleNoActionFilter() {
  const panel = document.getElementById('no-action-filter-panel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

// Handle no action period change
document.addEventListener('DOMContentLoaded', function() {
  const periodSelect = document.getElementById('no-action-period');
  if (periodSelect) {
    periodSelect.addEventListener('change', function() {
      const customDates = document.getElementById('no-action-custom-dates');
      if (this.value === 'custom') {
        customDates.style.display = 'flex';
      } else {
        customDates.style.display = 'none';
      }
    });
  }
});

// Clear no action filter
function clearNoActionFilter() {
  document.getElementById('no-action-period').value = '7';
  document.getElementById('no-action-start-date').value = '';
  document.getElementById('no-action-end-date').value = '';
  document.getElementById('no-action-custom-dates').style.display = 'none';
  
  noActionFilterActive = false;
  noActionFilterConfig = {
    days: 7,
    startDate: null,
    endDate: null
  };
  
  document.getElementById('no-action-filter-status').innerHTML = '<i class="fas fa-info-circle"></i> This will show leads assigned but not updated (no status changes or notes added) during the selected period.';
  
  // Close the filter panel
  toggleNoActionFilter();
  
  // Re-render leads without no action filter
  renderAllLeads();
}

// Apply no action filter
function applyNoActionFilter() {
  const period = document.getElementById('no-action-period').value;
  
  if (period === 'custom') {
    const startDate = document.getElementById('no-action-start-date').value;
    const endDate = document.getElementById('no-action-end-date').value;
    
    if (!startDate || !endDate) {
      showToast('Date Required', 'Please select both start and end dates', 'warning');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      showToast('Invalid Date Range', 'Start date must be before end date', 'warning');
      return;
    }
    
    noActionFilterConfig = {
      days: null,
      startDate: startDate,
      endDate: endDate
    };
  } else {
    noActionFilterConfig = {
      days: parseInt(period),
      startDate: null,
      endDate: null
    };
  }
  
  noActionFilterActive = true;
  
  // Update status message
  let statusMsg = '<i class="fas fa-check-circle"></i> <strong>Active Filter:</strong> ';
  if (noActionFilterConfig.days) {
    const labels = {
      '1': 'last 24 hours',
      '3': 'last 3 days',
      '7': 'last 7 days',
      '15': 'last 15 days',
      '30': 'last 30 days'
    };
    statusMsg += `Showing leads with no activity in the ${labels[noActionFilterConfig.days]}`;
  } else {
    statusMsg += `Showing leads with no activity from ${noActionFilterConfig.startDate} to ${noActionFilterConfig.endDate}`;
  }
  
  document.getElementById('no-action-filter-status').innerHTML = statusMsg;
  
  // Re-render leads with no action filter
  showLoading('Applying Filter...', 'Searching for inactive leads...');
  setTimeout(() => {
    renderAllLeads();
    hideLoading();
    showToast('Filter Applied', 'No action filter is now active', 'success');
  }, 300);
}

// Check if a lead has no action taken
function checkLeadNoAction(lead, config) {
  // Calculate the date range
  const now = new Date();
  let startDate, endDate;
  
  if (config.days) {
    endDate = now;
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - config.days);
  } else {
    startDate = new Date(config.startDate);
    endDate = new Date(config.endDate);
    endDate.setHours(23, 59, 59, 999);
  }
  
  // Check if lead was created in the time range
  const leadCreatedDate = new Date(lead.createdAt);
  if (leadCreatedDate > endDate) {
    // Lead was created after the period, exclude it
    return false;
  }
  
  // If lead was created after the start date, use creation date as start
  const effectiveStartDate = leadCreatedDate > startDate ? leadCreatedDate : startDate;
  
  // Check status history for any changes in the time period
  if (lead.statusHistory && lead.statusHistory.length > 0) {
    // Skip the first entry (initial status on creation)
    for (let i = 1; i < lead.statusHistory.length; i++) {
      const changeDate = new Date(lead.statusHistory[i].changedAt);
      if (changeDate >= effectiveStartDate && changeDate <= endDate) {
        // Status was changed during the period
        return false;
      }
    }
  }
  
  // Check notes for any additions in the time period
  if (lead.notes && lead.notes.length > 0) {
    for (const note of lead.notes) {
      const noteDate = new Date(note.createdAt);
      if (noteDate >= effectiveStartDate && noteDate <= endDate) {
        // Note was added during the period
        return false;
      }
    }
  }
  
  // No actions were taken during the period
  return true;
}

// ===== TRANSFER FILTER =====

// Toggle transfer filter panel
function toggleTransferFilter() {
  const panel = document.getElementById('transfer-filter-panel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

// Handle transfer date filter dropdown change
function handleTransferDateFilter() {
  const dateFilter = document.getElementById('transfer-date-filter').value;
  const customDates = document.getElementById('transfer-custom-dates');
  
  if (dateFilter === 'custom') {
    customDates.style.display = 'flex';
  } else {
    customDates.style.display = 'none';
  }
}

// Clear transfer filter
function clearTransferFilter() {
  document.getElementById('transfer-from-user').value = '';
  document.getElementById('transfer-to-user').value = '';
  document.getElementById('transfer-date-filter').value = 'all';
  document.getElementById('transfer-start-date').value = '';
  document.getElementById('transfer-end-date').value = '';
  document.getElementById('transfer-custom-dates').style.display = 'none';
  
  transferFilterActive = false;
  transferFilterConfig = {
    fromUser: '',
    toUser: '',
    dateFilter: 'all',
    startDate: null,
    endDate: null
  };
  
  document.getElementById('transfer-filter-status').innerHTML = '<i class="fas fa-info-circle"></i> Select transfer criteria and time period, then click Apply.';
  
  // Close the filter panel
  toggleTransferFilter();
  
  // Re-render leads without transfer filter
  renderAllLeads();
}

// Apply transfer filter
function applyTransferFilter() {
  const fromUser = document.getElementById('transfer-from-user').value;
  const toUser = document.getElementById('transfer-to-user').value;
  const dateFilter = document.getElementById('transfer-date-filter').value;
  
  if (!fromUser && !toUser) {
    showToast('Invalid Filter', 'Please select at least one user (From or To)', 'warning');
    return;
  }
  
  transferFilterConfig.fromUser = fromUser;
  transferFilterConfig.toUser = toUser;
  transferFilterConfig.dateFilter = dateFilter;
  
  if (dateFilter === 'custom') {
    const startDate = document.getElementById('transfer-start-date').value;
    const endDate = document.getElementById('transfer-end-date').value;
    
    if (!startDate || !endDate) {
      showToast('Date Required', 'Please select both start and end dates', 'warning');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      showToast('Invalid Date Range', 'Start date must be before end date', 'warning');
      return;
    }
    
    transferFilterConfig.startDate = startDate;
    transferFilterConfig.endDate = endDate;
  } else {
    transferFilterConfig.startDate = null;
    transferFilterConfig.endDate = null;
  }
  
  transferFilterActive = true;
  
  // Build status message
  let statusMsg = '<i class="fas fa-check-circle"></i> <strong>Active:</strong> Showing leads transferred ';
  if (fromUser && toUser) {
    statusMsg += `from ${fromUser} → ${toUser}`;
  } else if (fromUser) {
    statusMsg += `from ${fromUser} → Any user`;
  } else if (toUser) {
    statusMsg += `from Any user → ${toUser}`;
  }
  
  if (dateFilter !== 'all') {
    const filterLabels = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'week': 'This Week',
      '15days': 'Last 15 Days',
      '30days': 'Last 30 Days',
      'custom': `${transferFilterConfig.startDate} to ${transferFilterConfig.endDate}`
    };
    statusMsg += ` (${filterLabels[dateFilter]})`;
  }
  
  document.getElementById('transfer-filter-status').innerHTML = statusMsg;
  
  // Re-render leads with transfer filter
  showLoading('Applying Filter...', 'Searching for lead transfers...');
  setTimeout(() => {
    renderAllLeads();
    hideLoading();
    showToast('Filter Applied', 'Transfer filter is now active', 'success');
  }, 300);
}

// Check if a lead matches the transfer filter
function checkLeadTransfer(lead, config) {
  if (!lead.assignmentHistory || lead.assignmentHistory.length === 0) {
    return false;
  }

  // Get date range
  let startDate = null;
  let endDate = null;

  if (config.dateFilter !== 'all') {
    const dateRange = getDateRangeForTransition(config.dateFilter, config.startDate, config.endDate);
    startDate = dateRange.start;
    endDate = dateRange.end;
  }

  // Check assignment history for transfers
  for (let i = 0; i < lead.assignmentHistory.length; i++) {
    const assignment = lead.assignmentHistory[i];
    
    // Only check 'transferred' actions (skip initial assignments)
    if (assignment.action !== 'transferred') {
      continue;
    }
    
    const transferDate = new Date(assignment.changedAt);
    const fromUserName = assignment.fromUser ? assignment.fromUser.name : 'Unassigned';
    const toUserName = assignment.toUser ? assignment.toUser.name : 'Unassigned';

    // Check if date is in range
    if (startDate && endDate) {
      if (transferDate < startDate || transferDate > endDate) {
        continue;
      }
    }

    // Check if users match
    const fromMatch = !config.fromUser || fromUserName === config.fromUser;
    const toMatch = !config.toUser || toUserName === config.toUser;

    if (fromMatch && toMatch) {
      return true;
    }
  }

  return false;
}

// Modal functions for Create Lead
function openCreateLeadModal() {
  const modal = document.getElementById('create-lead-modal');
  modal.style.display = 'flex';
  document.getElementById('create-lead-form').reset();
  document.getElementById('create-lead-message').style.display = 'none';
  document.getElementById('lead-custom-source').style.display = 'none';
  
  // Populate source dropdown with existing sources from database
  populateAdminCreateLeadSources();
  
  // Populate user select with clearer display
  const assignedSelect = document.getElementById('lead-assigned-to');
  assignedSelect.innerHTML = '<option value="">-- Select User to Assign --</option>';
  
  if (!users || users.length === 0) {
    console.error('No users available for assignment');
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No users available (please refresh page)';
    option.disabled = true;
    assignedSelect.appendChild(option);
    return;
  }
  
  users.forEach(u => {
    const option = document.createElement('option');
    option.value = u._id;
    option.textContent = u.name; // Show only name for clarity
    assignedSelect.appendChild(option);
  });
}

// Populate source dropdown with existing sources from leads
function populateAdminCreateLeadSources() {
  const sourceSelect = document.getElementById('lead-source');
  if (!sourceSelect || !allLeadsData) return;
  
  // Collect unique sources from existing leads
  const existingSources = new Set();
  allLeadsData.forEach(lead => {
    if (lead.source) existingSources.add(lead.source);
  });
  
  // Default sources
  const defaultSources = ['Other', 'Meta', 'Google', 'LinkedIn', 'Instagram', 'Facebook', 'Direct', 'Referral', 'Website'];
  
  // Merge with existing sources
  defaultSources.forEach(s => existingSources.add(s));
  
  // Sort and rebuild dropdown
  const sortedSources = Array.from(existingSources).sort();
  
  sourceSelect.innerHTML = '';
  sortedSources.forEach(source => {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source;
    sourceSelect.appendChild(option);
  });
  
  // Add custom source option at the end
  const customOption = document.createElement('option');
  customOption.value = '__custom__';
  customOption.textContent = '+ Add Custom Source';
  sourceSelect.appendChild(customOption);
}

// Toggle custom source input for admin create lead
function toggleAdminCustomSource() {
  const sourceSelect = document.getElementById('lead-source');
  const customInput = document.getElementById('lead-custom-source');
  
  if (sourceSelect.value === '__custom__') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = '';
  }
}

function closeCreateLeadModal() {
  const modal = document.getElementById('create-lead-modal');
  modal.style.display = 'none';
  document.getElementById('create-lead-form').reset();
  document.getElementById('create-lead-message').style.display = 'none';
  document.getElementById('lead-custom-source').style.display = 'none';
}

// Create lead form submission
document.getElementById('create-lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Handle source - check if custom source is selected
  let source = document.getElementById('lead-source').value;
  if (source === '__custom__') {
    source = document.getElementById('lead-custom-source').value.trim();
    if (!source) {
      showCreateLeadMessage('Please enter a custom source name', 'error');
      return;
    }
  }
  
  const leadData = {
    name: document.getElementById('lead-name').value.trim(),
    contact: document.getElementById('lead-contact').value.trim(),
    email: document.getElementById('lead-email').value.trim() || undefined,
    city: document.getElementById('lead-city').value.trim() || undefined,
    university: document.getElementById('lead-university').value.trim() || undefined,
    course: document.getElementById('lead-course').value.trim() || undefined,
    profession: document.getElementById('lead-profession').value.trim() || undefined,
    source: source,
    status: document.getElementById('lead-status').value,
    assignedTo: document.getElementById('lead-assigned-to').value
  };

  if (!leadData.name || !leadData.contact) {
    showCreateLeadMessage('Name and contact are required', 'error');
    return;
  }

  if (!leadData.assignedTo) {
    showCreateLeadMessage('Please select a user to assign the lead', 'error');
    return;
  }

  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/create-lead`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(leadData)
    });

    const data = await response.json();

    if (response.ok) {
      showCreateLeadMessage(data.message || 'Lead created successfully', 'success');
      document.getElementById('create-lead-form').reset();
      await loadAllLeads(); // Refresh the leads list
      // Refresh entire dashboard to show new lead in charts and stats
      await refreshDashboard();
      // Update admin polling timestamp to prevent self-notification
      adminLastCheckTimestamp = Date.now();
      setTimeout(() => closeCreateLeadModal(), 1500);
    } else {
      showCreateLeadMessage(data.message || 'Failed to create lead', 'error');
    }
  } catch (error) {
    showCreateLeadMessage('An error occurred while creating lead', 'error');
    console.error('Create lead error:', error);
  }
});

function showCreateLeadMessage(message, type) {
  const msgDiv = document.getElementById('create-lead-message');
  msgDiv.textContent = message;
  msgDiv.className = `message ${type}`;
  msgDiv.style.display = 'block';
  setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
}

// Load all leads
async function loadAllLeads() {
  const tbody = document.getElementById('all-leads-tbody');
  tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 40px; color: #9ca3af;">Loading...</td></tr>';
  
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/all-leads`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok && data.leads) {
      allLeadsData = data.leads;
      
      // Fetch all users from the system (not just from leads)
      let allUsers = [];
      try {
        const usersResponse = await fetch(`${API_URL}/admin/users`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersResponse.ok) {
          allUsers = await usersResponse.json();
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
      
      // Populate user filter with all users from the system
      const userFilter = document.getElementById('all-leads-user-filter');
      userFilter.innerHTML = '<option value="">All Users</option>';
      if (allUsers.length > 0) {
        allUsers.sort((a, b) => a.name.localeCompare(b.name)).forEach(user => {
          const option = document.createElement('option');
          option.value = user.name;
          option.textContent = user.name;
          userFilter.appendChild(option);
        });
      }
      
      // Populate source filter with unique sources from leads
      populateAdminSourceFilter(allLeadsData);
      
      // Build multi-select dropdowns
      buildUserFilterMultiSelect();
      buildSourceFilterMultiSelect();
      buildUniversityFilterMultiSelect();
      buildBulkTransferMultiSelect();
      
      // Populate transfer filter user dropdowns with all users from the system
      const transferFromUser = document.getElementById('transfer-from-user');
      const transferToUser = document.getElementById('transfer-to-user');
      if (transferFromUser && transferToUser && allUsers.length > 0) {
        transferFromUser.innerHTML = '<option value="">Any User</option>';
        transferToUser.innerHTML = '<option value="">Any User</option>';
        
        allUsers.sort((a, b) => a.name.localeCompare(b.name)).forEach(user => {
          const optionFrom = document.createElement('option');
          optionFrom.value = user.name;
          optionFrom.textContent = user.name;
          transferFromUser.appendChild(optionFrom);
          
          const optionTo = document.createElement('option');
          optionTo.value = user.name;
          optionTo.textContent = user.name;
          transferToUser.appendChild(optionTo);
        });
      }
      
      // Populate bulk transfer dropdown with all user IDs from the system
      const bulkTransferSelect = document.getElementById('bulk-transfer-select');
      if (bulkTransferSelect && allUsers.length > 0) {
        bulkTransferSelect.innerHTML = '<option value="">Transfer To...</option>';
        
        allUsers.sort((a, b) => a.name.localeCompare(b.name)).forEach(user => {
          const option = document.createElement('option');
          option.value = user._id;
          option.textContent = user.name;
          bulkTransferSelect.appendChild(option);
        });
      }

      renderAllLeads();
    } else {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 40px; color: #e11d48;">Error loading leads</td></tr>';
    }
  } catch (error) {
    console.error('Error loading all leads:', error);
    tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 40px; color: #e11d48;">Error loading leads</td></tr>';
  }
}

// Populate source filter with unique sources
function populateAdminSourceFilter(leads) {
  const sourceFilter = document.getElementById('all-leads-source-filter');
  const currentSelection = sourceFilter.value;
  
  // Get unique sources
  const sources = [...new Set(leads.map(lead => lead.source || 'Other'))].sort();
  
  sourceFilter.innerHTML = '<option value="">All Sources</option>';
  sources.forEach(source => {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source;
    sourceFilter.appendChild(option);
  });
  
  // Restore previous selection
  sourceFilter.value = currentSelection;
}

// Render all leads with filters applied
function renderAllLeads() {
  const tbody = document.getElementById('all-leads-tbody');
  const searchTerm = document.getElementById('all-leads-search').value.toLowerCase();

  let filteredLeads = allLeadsData;

  // Apply search filter
  if (searchTerm) {
    filteredLeads = filteredLeads.filter(lead => 
      (lead.name && lead.name.toLowerCase().includes(searchTerm)) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
      (lead.contact && lead.contact.toLowerCase().includes(searchTerm)) ||
      (lead.city && lead.city.toLowerCase().includes(searchTerm)) ||
      (lead.university && lead.university.toLowerCase().includes(searchTerm)) ||
      (lead.course && lead.course.toLowerCase().includes(searchTerm)) ||
      (lead.profession && lead.profession.toLowerCase().includes(searchTerm)) ||
      (lead.source && lead.source.toLowerCase().includes(searchTerm))
    );
  }

  // Apply multi-select status filter
  if (selectedStatusFilters.length > 0) {
    filteredLeads = filteredLeads.filter(lead => selectedStatusFilters.includes(lead.status));
  }

  // Apply multi-select user filter
  if (selectedUserFilters.length > 0) {
    filteredLeads = filteredLeads.filter(lead => {
      const userName = lead.assignedTo ? lead.assignedTo.name : 'Unassigned';
      return selectedUserFilters.includes(userName);
    });
  }

  // Apply multi-select source filter
  if (selectedSourceFilters.length > 0) {
    filteredLeads = filteredLeads.filter(lead => selectedSourceFilters.includes(lead.source || 'Other'));
  }

  // Apply multi-select university filter
  if (selectedUniversityFilters.length > 0) {
    filteredLeads = filteredLeads.filter(lead => selectedUniversityFilters.includes(lead.university || 'Not Specified'));
  }

  // Apply transition filter if active
  if (transitionFilterActive) {
    filteredLeads = filteredLeads.filter(lead => {
      return checkLeadStatusTransition(lead, transitionFilterConfig);
    });
  }

  // Apply no action filter if active
  if (noActionFilterActive) {
    filteredLeads = filteredLeads.filter(lead => {
      return checkLeadNoAction(lead, noActionFilterConfig);
    });
  }

  // Apply transfer filter if active
  if (transferFilterActive) {
    filteredLeads = filteredLeads.filter(lead => {
      return checkLeadTransfer(lead, transferFilterConfig);
    });
  }

  // Store filtered data for pagination
  filteredLeadsData = filteredLeads;
  
  // Reset to page 1 when filters change
  currentPage = 1;
  
  // Render paginated results
  renderPaginatedLeads();
}

// Clear all filters function
function clearAllFilters() {
  // Clear search input
  const searchInput = document.getElementById('all-leads-search');
  if (searchInput) searchInput.value = '';
  
  // Reset multi-select filters
  selectedStatusFilters = [];
  selectedUserFilters = [];
  selectedSourceFilters = [];
  selectedUniversityFilters = [];
  
  // Reset multi-select UI
  const statusToggle = document.getElementById('status-multiselect-toggle');
  if (statusToggle) statusToggle.textContent = 'All Statuses';
  document.querySelectorAll('#status-multiselect-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  
  const userToggle = document.getElementById('user-filter-toggle');
  if (userToggle) userToggle.textContent = 'All Users';
  document.querySelectorAll('#user-filter-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  
  const sourceToggle = document.getElementById('source-multiselect-toggle');
  if (sourceToggle) sourceToggle.textContent = 'All Sources';
  document.querySelectorAll('#source-multiselect-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  
  const universityToggle = document.getElementById('university-multiselect-toggle');
  if (universityToggle) universityToggle.textContent = 'All Universities';
  document.querySelectorAll('#university-multiselect-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  
  // Keep hidden inputs empty for backward compatibility
  const statusFilter = document.getElementById('all-leads-status-filter');
  if (statusFilter) statusFilter.value = '';
  
  const userFilter = document.getElementById('all-leads-user-filter');
  if (userFilter) userFilter.value = '';
  
  const sourceFilter = document.getElementById('all-leads-source-filter');
  if (sourceFilter) sourceFilter.value = '';
  
  // Close and reset status transition filter
  const transitionPanel = document.getElementById('transition-filter-panel');
  if (transitionPanel) transitionPanel.style.display = 'none';
  
  const transitionFromStatus = document.getElementById('transition-from-status');
  if (transitionFromStatus) transitionFromStatus.value = '';
  
  const transitionToStatus = document.getElementById('transition-to-status');
  if (transitionToStatus) transitionToStatus.value = '';
  
  const transitionDateFilter = document.getElementById('transition-date-filter');
  if (transitionDateFilter) transitionDateFilter.value = 'all';
  
  const transitionStartDate = document.getElementById('transition-start-date');
  if (transitionStartDate) transitionStartDate.value = '';
  
  const transitionEndDate = document.getElementById('transition-end-date');
  if (transitionEndDate) transitionEndDate.value = '';
  
  const transitionCustomDates = document.getElementById('transition-custom-dates');
  if (transitionCustomDates) transitionCustomDates.style.display = 'none';
  
  const transitionStatus = document.getElementById('transition-filter-status');
  if (transitionStatus) transitionStatus.innerHTML = '<i class="fas fa-info-circle"></i> Select status transition and time period, then click Apply.';
  
  statusTransitionFilterActive = false;
  transitionFilterConfig = {
    fromStatus: '',
    toStatus: '',
    dateFilter: 'all',
    startDate: null,
    endDate: null
  };
  
  // Close and reset no action filter
  const noActionPanel = document.getElementById('no-action-filter-panel');
  if (noActionPanel) noActionPanel.style.display = 'none';
  
  const noActionPeriod = document.getElementById('no-action-period');
  if (noActionPeriod) noActionPeriod.value = '7';
  
  const noActionStartDate = document.getElementById('no-action-start-date');
  if (noActionStartDate) noActionStartDate.value = '';
  
  const noActionEndDate = document.getElementById('no-action-end-date');
  if (noActionEndDate) noActionEndDate.value = '';
  
  const noActionCustomDates = document.getElementById('no-action-custom-dates');
  if (noActionCustomDates) noActionCustomDates.style.display = 'none';
  
  const noActionStatus = document.getElementById('no-action-filter-status');
  if (noActionStatus) noActionStatus.innerHTML = '<i class="fas fa-info-circle"></i> This will show leads assigned but not updated (no status changes or notes added) during the selected period.';
  
  noActionFilterActive = false;
  noActionFilterConfig = {
    days: 7,
    startDate: null,
    endDate: null
  };
  
  // Close and reset transfer filter
  const transferPanel = document.getElementById('transfer-filter-panel');
  if (transferPanel) transferPanel.style.display = 'none';
  
  const transferFromUser = document.getElementById('transfer-from-user');
  if (transferFromUser) transferFromUser.value = '';
  
  const transferToUser = document.getElementById('transfer-to-user');
  if (transferToUser) transferToUser.value = '';
  
  const transferDateFilter = document.getElementById('transfer-date-filter');
  if (transferDateFilter) transferDateFilter.value = 'all';
  
  const transferStartDate = document.getElementById('transfer-start-date');
  if (transferStartDate) transferStartDate.value = '';
  
  const transferEndDate = document.getElementById('transfer-end-date');
  if (transferEndDate) transferEndDate.value = '';
  
  const transferCustomDates = document.getElementById('transfer-custom-dates');
  if (transferCustomDates) transferCustomDates.style.display = 'none';
  
  const transferStatus = document.getElementById('transfer-filter-status');
  if (transferStatus) transferStatus.innerHTML = '<i class="fas fa-info-circle"></i> Select transfer criteria and time period, then click Apply.';
  
  transferFilterActive = false;
  transferFilterConfig = {
    fromUser: '',
    toUser: '',
    dateFilter: 'all',
    startDate: null,
    endDate: null
  };
  
  // Reapply filters (which will show all leads since filters are cleared)
  renderAllLeads();
}

// Check if a lead matches the status transition filter
function checkLeadStatusTransition(lead, config) {
  if (!lead.statusHistory || lead.statusHistory.length === 0) {
    return false;
  }

  // Get date range
  let startDate = null;
  let endDate = null;

  if (config.dateFilter !== 'all') {
    const dateRange = getDateRangeForTransition(config.dateFilter, config.startDate, config.endDate);
    startDate = dateRange.start;
    endDate = dateRange.end;
  }

  // Only check the latest 2 states (most recent transition)
  // If there's only 1 status in history, there's no transition
  if (lead.statusHistory.length < 2) {
    return false;
  }

  // Get the last two status entries (latest transition)
  const secondLast = lead.statusHistory[lead.statusHistory.length - 2];
  const last = lead.statusHistory[lead.statusHistory.length - 1];
  
  const prevStatus = secondLast.status;
  const currStatus = last.status;
  const changeDate = new Date(last.changedAt);

  // Check if date is in range
  if (startDate && endDate) {
    if (changeDate < startDate || changeDate > endDate) {
      return false;
    }
  }

  // Check if transition matches
  const fromMatch = !config.fromStatus || prevStatus === config.fromStatus;
  const toMatch = !config.toStatus || currStatus === config.toStatus;

  return fromMatch && toMatch;
}

// Get date range for transition filter
function getDateRangeForTransition(filterValue, customStart, customEnd) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let start, end;
  
  switch(filterValue) {
    case 'today':
      start = new Date(today);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start = new Date(today);
      start.setDate(start.getDate() - today.getDay());
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case '15days':
      start = new Date(today);
      start.setDate(start.getDate() - 15);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case '30days':
      start = new Date(today);
      start.setDate(start.getDate() - 30);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      return { start: null, end: null };
  }
  
  return { start, end };
}

// Render paginated leads
function renderPaginatedLeads() {
  const tbody = document.getElementById('all-leads-tbody');
  
  // Update total stats
  document.getElementById('all-leads-total').textContent = filteredLeadsData.length;
  // Also update the header count
  const headerCount = document.getElementById('all-leads-total-header');
  if (headerCount) {
    headerCount.textContent = filteredLeadsData.length;
  }

  // Uncheck select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-leads');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
  }

  if (filteredLeadsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #9ca3af;">No leads found</td></tr>';
    updatePaginationControls();
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredLeadsData.length / leadsPerPage);
  const startIndex = (currentPage - 1) * leadsPerPage;
  const endIndex = Math.min(startIndex + leadsPerPage, filteredLeadsData.length);
  const paginatedLeads = filteredLeadsData.slice(startIndex, endIndex);

  // Update showing stats
  document.getElementById('all-leads-showing').textContent = `${startIndex + 1}-${endIndex} of ${filteredLeadsData.length}`;

  tbody.innerHTML = '';
  paginatedLeads.forEach(lead => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => viewLeadDetail(lead._id);
    
    const isSelected = selectedLeadIds.includes(lead._id);
    
    tr.innerHTML = `
      <td onclick="event.stopPropagation();"><input type="checkbox" class="lead-checkbox" data-lead-id="${lead._id}" ${isSelected ? 'checked' : ''} onchange="toggleLeadSelection('${lead._id}')"></td>
      <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lead.name || 'N/A'}">${lead.name || 'N/A'}</td>
      <td>${lead.contact || 'N/A'}</td>
      <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lead.city || 'N/A'}">${lead.city || 'N/A'}</td>
      <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lead.university || 'N/A'}">${lead.university || 'N/A'}</td>
      <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lead.source || 'Other'}">${lead.source || 'Other'}</td>
      <td><span class="status-badge status-${lead.status ? lead.status.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-') : 'unknown'}">${lead.status || 'Unknown'}</span></td>
      <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}">${lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}</td>
      <td>${new Date(lead.updatedAt).toLocaleDateString()}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Update pagination controls
  updatePaginationControls();
}

// Update pagination controls
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredLeadsData.length / leadsPerPage);
  
  document.getElementById('current-page').textContent = currentPage;
  document.getElementById('total-pages').textContent = totalPages || 1;
  
  // Enable/disable buttons
  document.getElementById('first-page-btn').disabled = currentPage === 1;
  document.getElementById('prev-page-btn').disabled = currentPage === 1;
  document.getElementById('next-page-btn').disabled = currentPage >= totalPages;
  document.getElementById('last-page-btn').disabled = currentPage >= totalPages;
}

// Pagination functions
function goToFirstPage() {
  currentPage = 1;
  renderPaginatedLeads();
}

function goToPrevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderPaginatedLeads();
  }
}

function goToNextPage() {
  const totalPages = Math.ceil(filteredLeadsData.length / leadsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderPaginatedLeads();
  }
}

function goToLastPage() {
  const totalPages = Math.ceil(filteredLeadsData.length / leadsPerPage);
  currentPage = totalPages || 1;
  renderPaginatedLeads();
}

function changeLeadsPerPage() {
  leadsPerPage = parseInt(document.getElementById('leads-per-page').value);
  currentPage = 1; // Reset to first page
  renderPaginatedLeads();
}

// Toggle individual lead selection
function toggleLeadSelection(leadId) {
  if (selectedLeadIds.includes(leadId)) {
    selectedLeadIds = selectedLeadIds.filter(id => id !== leadId);
  } else {
    selectedLeadIds.push(leadId);
  }
  updateBulkActionsBar();
  
  // Update Select button state if input has value
  const limitInput = document.getElementById('limit-selection-count');
  if (limitInput.value) {
    updateSelectButtonState(selectedLeadIds.length > 0);
  }
}

// Toggle select all leads (only on current page)
function toggleSelectAll() {
  const checkbox = document.getElementById('select-all-leads');
  
  if (checkbox.checked) {
    // Select ALL filtered leads (across all pages)
    selectedLeadIds = [];
    filteredLeadsData.forEach(lead => {
      selectedLeadIds.push(lead._id);
    });
    
    // Check visible checkboxes on current page
    const checkboxes = document.querySelectorAll('.lead-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = true;
    });
    
    showToast('Selection Complete', `Selected all ${selectedLeadIds.length} filtered lead(s) across all pages`, 'success');
  } else {
    // Deselect all leads
    selectedLeadIds = [];
    const checkboxes = document.querySelectorAll('.lead-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
  }
  
  updateBulkActionsBar();
  updateSelectButtonState(selectedLeadIds.length > 0);
}

// Update bulk actions bar
function updateBulkActionsBar() {
  const bar = document.getElementById('bulk-actions-bar');
  const countSpan = document.getElementById('selected-count');
  
  countSpan.textContent = selectedLeadIds.length;
  
  if (selectedLeadIds.length > 0) {
    bar.style.display = 'block';
  } else {
    bar.style.display = 'none';
  }
}

// Clear selection
function clearSelection() {
  selectedLeadIds = [];
  document.getElementById('select-all-leads').checked = false;
  document.querySelectorAll('.lead-checkbox').forEach(cb => cb.checked = false);
  updateBulkActionsBar();
  updateSelectButtonState(false);
}

// Update Select button styling based on selection state
function updateSelectButtonState(hasSelection) {
  const limitInput = document.getElementById('limit-selection-count');
  const selectBtn = limitInput.parentElement.querySelector('button');
  
  if (hasSelection) {
    selectBtn.style.background = '#10b981';
    selectBtn.style.borderColor = '#10b981';
    selectBtn.style.color = 'white';
    selectBtn.innerHTML = '<i class="fas fa-check-circle"></i> Selected';
  } else {
    selectBtn.style.background = '';
    selectBtn.style.borderColor = '';
    selectBtn.style.color = '';
    selectBtn.innerHTML = '<i class="fas fa-check-square"></i> Select';
  }
}

// Reset select button when input changes
function resetSelectButtonState() {
  updateSelectButtonState(false);
}

// Show loading overlay
function showLoading(message = 'Processing...', submessage = 'Please wait while we apply your changes') {
  document.getElementById('loading-message').textContent = message;
  document.getElementById('loading-submessage').textContent = submessage;
  document.getElementById('loading-overlay').style.display = 'block';
}

// Hide loading overlay
function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// Show confirmation modal
function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').innerHTML = message;
  document.getElementById('confirmation-modal').style.display = 'block';
  
  const confirmBtn = document.getElementById('confirm-action-btn');
  confirmBtn.onclick = () => {
    closeConfirmModal();
    onConfirm();
  };
}

// Close confirmation modal
function closeConfirmModal() {
  document.getElementById('confirmation-modal').style.display = 'none';
}

// Show toast notification
function showToast(title, message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const icon = document.getElementById('toast-icon');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  
  // Set colors and icons based on type
  if (type === 'success') {
    toast.style.borderLeftColor = '#10b981';
    icon.className = 'fas fa-check-circle';
    icon.style.color = '#10b981';
    toastTitle.textContent = title || 'Success';
  } else if (type === 'error') {
    toast.style.borderLeftColor = '#ef4444';
    icon.className = 'fas fa-exclamation-circle';
    icon.style.color = '#ef4444';
    toastTitle.textContent = title || 'Error';
  } else if (type === 'warning') {
    toast.style.borderLeftColor = '#f59e0b';
    icon.className = 'fas fa-exclamation-triangle';
    icon.style.color = '#f59e0b';
    toastTitle.textContent = title || 'Warning';
  }
  
  toastMessage.textContent = message;
  toast.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => closeToast(), 5000);
}

// Close toast
function closeToast() {
  document.getElementById('toast-notification').style.display = 'none';
}

// Bulk update status
// Select limited number of leads
function selectLimitedLeads() {
  const limitInput = document.getElementById('limit-selection-count');
  const limit = parseInt(limitInput.value);
  
  if (!limit || limit < 1) {
    showToast('Invalid Input', 'Please enter a valid number of leads to select', 'warning');
    return;
  }
  
  if (filteredLeadsData.length === 0) {
    showToast('No Leads', 'No leads available to select', 'warning');
    return;
  }
  
  // Clear current selection
  clearSelection();
  
  // Select first N leads from ALL filtered data (across all pages)
  const leadsToSelect = Math.min(limit, filteredLeadsData.length);
  for (let i = 0; i < leadsToSelect; i++) {
    selectedLeadIds.push(filteredLeadsData[i]._id);
  }
  
  // Check visible checkboxes on current page that are selected
  const checkboxes = document.querySelectorAll('.lead-checkbox');
  checkboxes.forEach(cb => {
    const leadId = cb.getAttribute('data-lead-id');
    if (selectedLeadIds.includes(leadId)) {
      cb.checked = true;
    }
  });
  
  updateBulkActionsBar();
  updateSelectButtonState(true);
  
  if (leadsToSelect > leadsPerPage) {
    showToast('Leads Selected', `Selected first ${leadsToSelect} lead(s) across multiple pages`, 'success');
  } else {
    showToast('Leads Selected', `Selected first ${leadsToSelect} lead(s)`, 'success');
  }
}

// Combined bulk action (status update + transfer with distribution)
async function performBulkActions() {
  const status = document.getElementById('bulk-status-select').value;
  const hasTransfer = selectedTransferUserIds.length > 0;
  
  if (!status && !hasTransfer) {
    showToast('No Action Selected', 'Please select a status to update and/or user(s) to transfer leads to', 'warning');
    return;
  }

  if (selectedLeadIds.length === 0) {
    showToast('No Selection', 'Please select at least one lead', 'warning');
    return;
  }

  // Build confirmation message
  let actions = [];
  if (status) actions.push(`Update status to <strong>"${status}"</strong>`);
  if (hasTransfer) {
    if (selectedTransferUserIds.length === 1) {
      const user = users.find(u => u._id === selectedTransferUserIds[0]);
      actions.push(`Transfer to <strong>${user ? user.name : 'selected user'}</strong>`);
    } else {
      const userNames = selectedTransferUserIds.map(id => {
        const user = users.find(u => u._id === id);
        return user ? user.name : 'Unknown';
      });
      const leadsPerUser = Math.floor(selectedLeadIds.length / selectedTransferUserIds.length);
      const remainder = selectedLeadIds.length % selectedTransferUserIds.length;
      actions.push(`Distribute equally to <strong>${userNames.join(', ')}</strong><br><small>(~${leadsPerUser}${remainder > 0 ? '-' + (leadsPerUser + 1) : ''} leads each)</small>`);
    }
  }
  
  const message = `${actions.join(' and ')} for <strong>${selectedLeadIds.length} lead(s)</strong>?<br><br><small style="color: #6b7280;">This action will be performed as a single optimized operation.</small>`;
  
  showConfirmModal('Confirm Bulk Actions', message, async () => {
    try {
      showLoading('Applying Actions...', 'Please wait while we process your request');
      
      const token = getToken();
      
      // Handle distributed transfer (multiple users)
      if (hasTransfer && selectedTransferUserIds.length > 1) {
        // Distribute leads equally among selected users
        const response = await fetch(`${API_URL}/admin/bulk-distribute-leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            leadIds: selectedLeadIds,
            userIds: selectedTransferUserIds,
            status: status || undefined
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          hideLoading();
          showToast('Distribution Failed', data.message || 'Failed to distribute leads', 'error');
          return;
        }
        
        hideLoading();
        adminLastCheckTimestamp = Date.now(); // Prevent self-notification
        await loadAllLeads();
        await refreshDashboard();
        
        document.getElementById('bulk-status-select').value = '';
        clearTransferUsers();
        
        showToast('Distribution Completed', data.message || `Leads distributed to ${selectedTransferUserIds.length} users`, 'success');
        
      } else if (status && hasTransfer) {
        // Both status and single user transfer - use combined endpoint
        const response = await fetch(`${API_URL}/admin/bulk-update-leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            leadIds: selectedLeadIds,
            status: status,
            toUserId: selectedTransferUserIds[0]
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          hideLoading();
          showToast('Update Failed', data.message || 'Failed to update leads', 'error');
          return;
        }
        
        hideLoading();
        adminLastCheckTimestamp = Date.now(); // Prevent self-notification
        await loadAllLeads();
        await refreshDashboard();
        
        document.getElementById('bulk-status-select').value = '';
        clearTransferUsers();
        
        const user = users.find(u => u._id === selectedTransferUserIds[0]);
        showToast('Actions Completed', `${data.modifiedCount} lead(s) updated: status to "${status}" and transferred to ${user ? user.name : 'user'}. Selection preserved.`, 'success');
        
      } else if (status) {
        // Status only
        const statusResponse = await fetch(`${API_URL}/admin/bulk-update-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            leadIds: selectedLeadIds,
            status: status
          })
        });

        const statusData = await statusResponse.json();
        
        if (!statusResponse.ok) {
          hideLoading();
          showToast('Status Update Failed', statusData.message || 'Failed to update lead status', 'error');
          return;
        }
        
        hideLoading();
        adminLastCheckTimestamp = Date.now(); // Prevent self-notification
        await loadAllLeads();
        await refreshDashboard();
        document.getElementById('bulk-status-select').value = '';
        showToast('Status Updated', `${statusData.updatedCount} lead(s) updated to "${status}". Selection preserved.`, 'success');
        
      } else if (hasTransfer && selectedTransferUserIds.length === 1) {
        // Single user transfer only
        const transferResponse = await fetch(`${API_URL}/admin/bulk-transfer-leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            leadIds: selectedLeadIds,
            toUserId: selectedTransferUserIds[0]
          })
        });

        const transferData = await transferResponse.json();
        
        if (!transferResponse.ok) {
          hideLoading();
          showToast('Transfer Failed', transferData.message || 'Failed to transfer leads', 'error');
          return;
        }
        
        hideLoading();
        adminLastCheckTimestamp = Date.now(); // Prevent self-notification
        await loadAllLeads();
        await refreshDashboard();
        clearTransferUsers();
        
        const user = users.find(u => u._id === selectedTransferUserIds[0]);
        showToast('Transfer Completed', `${transferData.transferredCount} lead(s) transferred to ${user ? user.name : 'user'}. Selection preserved.`, 'success');
      }
      
    } catch (error) {
      hideLoading();
      showToast('Error', 'An error occurred while performing actions', 'error');
      console.error('Bulk action error:', error);
    }
  });
}

// Legacy function kept for compatibility
async function bulkUpdateStatus() {
  const status = document.getElementById('bulk-status-select').value;
  
  if (!status) {
    showToast('No Selection', 'Please select a status', 'warning');
    return;
  }

  if (selectedLeadIds.length === 0) {
    showToast('No Selection', 'Please select at least one lead', 'warning');
    return;
  }

  showConfirmModal('Confirm Status Update', `Update <strong>${selectedLeadIds.length} lead(s)</strong> to status <strong>"${status}"</strong>?`, async () => {
    try {
      showLoading('Updating Status...', 'Please wait');
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/bulk-update-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          status: status
        })
      });

      const data = await response.json();
      hideLoading();

      if (response.ok) {
        showToast('Success', data.message || 'Leads updated successfully. Selection preserved for additional actions.', 'success');
        // Don't clear selection - allows chaining operations (e.g., update status then transfer)
        await loadAllLeads();
        // Refresh entire dashboard dynamically
        await refreshDashboard();
        document.getElementById('bulk-status-select').value = '';
      } else {
        showToast('Update Failed', data.message || 'Failed to update leads', 'error');
      }
    } catch (error) {
      hideLoading();
      showToast('Error', 'An error occurred while updating leads', 'error');
      console.error('Bulk update error:', error);
    }
  });
}

// Bulk transfer leads
async function bulkTransferLeads() {
  const toUserId = document.getElementById('bulk-transfer-select').value;
  
  if (!toUserId) {
    showToast('No Selection', 'Please select a user to transfer leads to', 'warning');
    return;
  }

  if (selectedLeadIds.length === 0) {
    showToast('No Selection', 'Please select at least one lead to transfer', 'warning');
    return;
  }

  const toUserName = document.getElementById('bulk-transfer-select').selectedOptions[0].text;
  showConfirmModal('Confirm Transfer', `Transfer <strong>${selectedLeadIds.length} lead(s)</strong> to <strong>${toUserName}</strong>?`, async () => {
    try {
      showLoading('Transferring Leads...', 'Please wait');
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/bulk-transfer-leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          toUserId: toUserId
        })
      });

      const data = await response.json();
      hideLoading();

      if (response.ok) {
        showToast('Success', data.message || 'Leads transferred successfully. Selection preserved for additional actions.', 'success');
        // Don't clear selection - allows chaining operations
        await loadAllLeads();
        // Refresh entire dashboard dynamically
        await refreshDashboard();
        document.getElementById('bulk-transfer-select').value = '';
      } else {
        showToast('Transfer Failed', data.message || 'Failed to transfer leads', 'error');
      }
    } catch (error) {
      hideLoading();
      showToast('Error', 'An error occurred while transferring leads', 'error');
      console.error('Bulk transfer error:', error);
    }
  });
}

// Bulk delete leads
async function bulkDeleteLeads() {
  if (selectedLeadIds.length === 0) {
    showToast('No Selection', 'Please select at least one lead to delete', 'warning');
    return;
  }

  const message = `Are you sure you want to delete <strong>${selectedLeadIds.length} lead(s)</strong>?<br><br><small style="color: #ef4444;">⚠️ This action cannot be undone.</small>`;
  
  showConfirmModal('Confirm Deletion', message, async () => {
    try {
      showLoading('Deleting Leads...', 'Please wait while we delete the selected leads');
      
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/bulk-delete-leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadIds: selectedLeadIds
        })
      });

      const data = await response.json();
      
      hideLoading();

      if (response.ok) {
        showToast('Leads Deleted', data.message || `${selectedLeadIds.length} lead(s) deleted successfully`, 'success');
        clearSelection();
        await loadAllLeads();
        // Refresh entire dashboard dynamically
        await refreshDashboard();
      } else {
        showToast('Deletion Failed', data.message || 'Failed to delete leads', 'error');
      }
    } catch (error) {
      hideLoading();
      showToast('Error', 'An error occurred while deleting leads', 'error');
      console.error('Bulk delete error:', error);
    }
  });
}

// View lead detail (reuse existing modal)
function viewLeadDetail(leadId) {
  openLeadModal(leadId);
}

// ============ Multi-Select Filter Functions ============

// Status multi-select functions
function selectAllStatuses() {
  const checkboxes = document.querySelectorAll('#status-multiselect-dropdown input[type="checkbox"]');
  selectedStatusFilters = [];
  checkboxes.forEach(cb => {
    cb.checked = true;
    selectedStatusFilters.push(cb.value);
  });
  updateStatusFilterLabel();
  renderAllLeads();
}

function clearStatusFilter() {
  selectedStatusFilters = [];
  document.querySelectorAll('#status-multiselect-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateStatusFilterLabel();
  renderAllLeads();
}

function updateStatusFilter() {
  selectedStatusFilters = [];
  document.querySelectorAll('#status-multiselect-dropdown input[type="checkbox"]:checked').forEach(cb => {
    selectedStatusFilters.push(cb.value);
  });
  updateStatusFilterLabel();
  renderAllLeads();
}

function updateStatusFilterLabel() {
  const toggle = document.getElementById('status-multiselect-toggle');
  if (selectedStatusFilters.length === 0) {
    toggle.textContent = 'All Statuses';
  } else if (selectedStatusFilters.length === 1) {
    toggle.textContent = selectedStatusFilters[0];
  } else {
    toggle.textContent = `${selectedStatusFilters.length} statuses`;
  }
}

// User filter multi-select functions
function buildUserFilterMultiSelect() {
  const toggle = document.getElementById('user-filter-toggle');
  const dropdown = document.getElementById('user-filter-dropdown');
  if (!toggle || !dropdown) return;

  dropdown.innerHTML = '';

  // Actions row
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px;';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'btn btn-secondary';
  selectAllBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.onclick = () => selectAllUserFilters();
  
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-secondary';
  clearBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  clearBtn.textContent = 'Clear';
  clearBtn.onclick = () => clearUserFilters();
  
  actions.appendChild(selectAllBtn);
  actions.appendChild(clearBtn);
  dropdown.appendChild(actions);

  // Add Unassigned option first
  const unassignedItem = document.createElement('label');
  unassignedItem.className = 'multi-select-item';
  const unassignedCb = document.createElement('input');
  unassignedCb.type = 'checkbox';
  unassignedCb.value = 'Unassigned';
  unassignedCb.onchange = () => updateUserFilters();
  const unassignedSpan = document.createElement('span');
  unassignedSpan.textContent = 'Unassigned';
  unassignedItem.appendChild(unassignedCb);
  unassignedItem.appendChild(unassignedSpan);
  dropdown.appendChild(unassignedItem);

  // Add all users
  users.forEach(u => {
    const item = document.createElement('label');
    item.className = 'multi-select-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = u.name;
    cb.onchange = () => updateUserFilters();
    const span = document.createElement('span');
    span.textContent = `${u.name} (${u.email})`;
    item.appendChild(cb);
    item.appendChild(span);
    dropdown.appendChild(item);
  });
}

function selectAllUserFilters() {
  selectedUserFilters = ['Unassigned'];
  users.forEach(u => selectedUserFilters.push(u.name));
  document.querySelectorAll('#user-filter-dropdown input[type="checkbox"]').forEach(cb => cb.checked = true);
  updateUserFilterLabel();
  renderAllLeads();
}

function clearUserFilters() {
  selectedUserFilters = [];
  document.querySelectorAll('#user-filter-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateUserFilterLabel();
  renderAllLeads();
}

function updateUserFilters() {
  selectedUserFilters = [];
  document.querySelectorAll('#user-filter-dropdown input[type="checkbox"]:checked').forEach(cb => {
    selectedUserFilters.push(cb.value);
  });
  updateUserFilterLabel();
  renderAllLeads();
}

function updateUserFilterLabel() {
  const toggle = document.getElementById('user-filter-toggle');
  if (selectedUserFilters.length === 0) {
    toggle.textContent = 'All Users';
  } else if (selectedUserFilters.length === 1) {
    toggle.textContent = selectedUserFilters[0];
  } else {
    toggle.textContent = `${selectedUserFilters.length} users`;
  }
}

// Source filter multi-select functions
function buildSourceFilterMultiSelect() {
  const toggle = document.getElementById('source-multiselect-toggle');
  const dropdown = document.getElementById('source-multiselect-dropdown');
  if (!toggle || !dropdown || !allLeadsData) return;

  // Collect unique sources
  const sources = new Set();
  allLeadsData.forEach(lead => {
    sources.add(lead.source || 'Other');
  });
  const sortedSources = Array.from(sources).sort();

  dropdown.innerHTML = '';

  // Actions row
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px;';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'btn btn-secondary';
  selectAllBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.onclick = () => selectAllSourceFilters();
  
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-secondary';
  clearBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  clearBtn.textContent = 'Clear';
  clearBtn.onclick = () => clearSourceFilters();
  
  actions.appendChild(selectAllBtn);
  actions.appendChild(clearBtn);
  dropdown.appendChild(actions);

  // Add all sources
  sortedSources.forEach(source => {
    const item = document.createElement('label');
    item.className = 'multi-select-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = source;
    cb.onchange = () => updateSourceFilters();
    const span = document.createElement('span');
    span.textContent = source;
    item.appendChild(cb);
    item.appendChild(span);
    dropdown.appendChild(item);
  });
}

function selectAllSourceFilters() {
  selectedSourceFilters = [];
  document.querySelectorAll('#source-multiselect-dropdown input[type="checkbox"]').forEach(cb => {
    cb.checked = true;
    selectedSourceFilters.push(cb.value);
  });
  updateSourceFilterLabel();
  renderAllLeads();
}

function clearSourceFilters() {
  selectedSourceFilters = [];
  document.querySelectorAll('#source-multiselect-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateSourceFilterLabel();
  renderAllLeads();
}

function updateSourceFilters() {
  selectedSourceFilters = [];
  document.querySelectorAll('#source-multiselect-dropdown input[type="checkbox"]:checked').forEach(cb => {
    selectedSourceFilters.push(cb.value);
  });
  updateSourceFilterLabel();
  renderAllLeads();
}

function updateSourceFilterLabel() {
  const toggle = document.getElementById('source-multiselect-toggle');
  if (selectedSourceFilters.length === 0) {
    toggle.textContent = 'All Sources';
  } else if (selectedSourceFilters.length === 1) {
    toggle.textContent = selectedSourceFilters[0];
  } else {
    toggle.textContent = `${selectedSourceFilters.length} sources`;
  }
}

// University filter multi-select functions
function buildUniversityFilterMultiSelect() {
  const toggle = document.getElementById('university-multiselect-toggle');
  const dropdown = document.getElementById('university-multiselect-dropdown');
  if (!toggle || !dropdown || !allLeadsData) return;

  // Collect unique universities
  const universities = new Set();
  allLeadsData.forEach(lead => {
    universities.add(lead.university || 'Not Specified');
  });
  const sortedUniversities = Array.from(universities).sort();

  dropdown.innerHTML = '';

  // Actions row
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px;';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'btn btn-secondary';
  selectAllBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.onclick = () => selectAllUniversityFilters();
  
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-secondary';
  clearBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  clearBtn.textContent = 'Clear';
  clearBtn.onclick = () => clearUniversityFilters();
  
  actions.appendChild(selectAllBtn);
  actions.appendChild(clearBtn);
  dropdown.appendChild(actions);

  // Add all universities
  sortedUniversities.forEach(university => {
    const item = document.createElement('label');
    item.className = 'multi-select-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = university;
    cb.onchange = () => updateUniversityFilters();
    const span = document.createElement('span');
    span.textContent = university;
    item.appendChild(cb);
    item.appendChild(span);
    dropdown.appendChild(item);
  });
}

function selectAllUniversityFilters() {
  selectedUniversityFilters = [];
  document.querySelectorAll('#university-multiselect-dropdown input[type="checkbox"]').forEach(cb => {
    cb.checked = true;
    selectedUniversityFilters.push(cb.value);
  });
  updateUniversityFilterLabel();
  renderAllLeads();
}

function clearUniversityFilters() {
  selectedUniversityFilters = [];
  document.querySelectorAll('#university-multiselect-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateUniversityFilterLabel();
  renderAllLeads();
}

function updateUniversityFilters() {
  selectedUniversityFilters = [];
  document.querySelectorAll('#university-multiselect-dropdown input[type="checkbox"]:checked').forEach(cb => {
    selectedUniversityFilters.push(cb.value);
  });
  updateUniversityFilterLabel();
  renderAllLeads();
}

function updateUniversityFilterLabel() {
  const toggle = document.getElementById('university-multiselect-toggle');
  if (selectedUniversityFilters.length === 0) {
    toggle.textContent = 'All Universities';
  } else if (selectedUniversityFilters.length === 1) {
    toggle.textContent = selectedUniversityFilters[0];
  } else {
    toggle.textContent = `${selectedUniversityFilters.length} universities`;
  }
}

// Bulk transfer multi-select functions
function buildBulkTransferMultiSelect() {
  const toggle = document.getElementById('bulk-transfer-toggle');
  const dropdown = document.getElementById('bulk-transfer-dropdown');
  if (!toggle || !dropdown) return;

  dropdown.innerHTML = '';

  // Actions row
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px;';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'btn btn-secondary';
  selectAllBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.onclick = () => selectAllTransferUsers();
  
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-secondary';
  clearBtn.style.cssText = 'font-size: 11px; padding: 4px 8px;';
  clearBtn.textContent = 'Clear';
  clearBtn.onclick = () => clearTransferUsers();
  
  actions.appendChild(selectAllBtn);
  actions.appendChild(clearBtn);
  dropdown.appendChild(actions);

  // Info text
  const info = document.createElement('div');
  info.style.cssText = 'font-size: 11px; color: #6b7280; padding: 4px 8px; margin-bottom: 8px; background: #f3f4f6; border-radius: 4px;';
  info.innerHTML = '<i class="fas fa-info-circle"></i> Leads will be distributed equally among selected users';
  dropdown.appendChild(info);

  // Add all users
  users.forEach(u => {
    const item = document.createElement('label');
    item.className = 'multi-select-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = u._id;
    cb.dataset.name = u.name;
    cb.onchange = () => updateTransferUsers();
    const span = document.createElement('span');
    span.textContent = `${u.name} (${u.email})`;
    item.appendChild(cb);
    item.appendChild(span);
    dropdown.appendChild(item);
  });
}

function selectAllTransferUsers() {
  selectedTransferUserIds = users.map(u => u._id);
  document.querySelectorAll('#bulk-transfer-dropdown input[type="checkbox"]').forEach(cb => cb.checked = true);
  updateTransferUsersLabel();
}

function clearTransferUsers() {
  selectedTransferUserIds = [];
  document.querySelectorAll('#bulk-transfer-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateTransferUsersLabel();
}

function updateTransferUsers() {
  selectedTransferUserIds = [];
  document.querySelectorAll('#bulk-transfer-dropdown input[type="checkbox"]:checked').forEach(cb => {
    selectedTransferUserIds.push(cb.value);
  });
  updateTransferUsersLabel();
}

function updateTransferUsersLabel() {
  const toggle = document.getElementById('bulk-transfer-toggle');
  if (selectedTransferUserIds.length === 0) {
    toggle.textContent = 'Transfer To...';
  } else if (selectedTransferUserIds.length === 1) {
    const user = users.find(u => u._id === selectedTransferUserIds[0]);
    toggle.textContent = user ? user.name : 'Transfer To...';
  } else {
    toggle.textContent = `${selectedTransferUserIds.length} users selected`;
  }
}

// Initialize multi-select dropdowns toggle behavior
function initMultiSelectDropdowns() {
  const multiSelects = [
    { toggle: 'status-multiselect-toggle', dropdown: 'status-multiselect-dropdown', container: 'status-multiselect' },
    { toggle: 'user-filter-toggle', dropdown: 'user-filter-dropdown', container: 'user-filter-multiselect' },
    { toggle: 'source-multiselect-toggle', dropdown: 'source-multiselect-dropdown', container: 'source-multiselect' },
    { toggle: 'university-multiselect-toggle', dropdown: 'university-multiselect-dropdown', container: 'university-multiselect' },
    { toggle: 'bulk-transfer-toggle', dropdown: 'bulk-transfer-dropdown', container: 'bulk-transfer-multiselect' }
  ];

  multiSelects.forEach(ms => {
    const toggle = document.getElementById(ms.toggle);
    const dropdown = document.getElementById(ms.dropdown);
    if (toggle && dropdown) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other dropdowns
        multiSelects.forEach(other => {
          if (other.dropdown !== ms.dropdown) {
            const otherDropdown = document.getElementById(other.dropdown);
            if (otherDropdown) otherDropdown.style.display = 'none';
          }
        });
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    multiSelects.forEach(ms => {
      const container = document.getElementById(ms.container);
      const dropdown = document.getElementById(ms.dropdown);
      if (container && dropdown && !container.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  });
}

// Setup event listeners for filters
// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Event listeners for all leads filters with debouncing
document.getElementById('all-leads-search').addEventListener('input', debounce(renderAllLeads, 300));

// Add escape key handler for create lead modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const createLeadModal = document.getElementById('create-lead-modal');
    if (createLeadModal && createLeadModal.style.display === 'flex') {
      closeCreateLeadModal();
      return;
    }
  }
});

// Auto-load all leads when page loads
document.addEventListener('DOMContentLoaded', function() {
  const allLeadsSection = document.getElementById('all-leads-tbody');
  if (allLeadsSection) {
    loadAllLeads();
  }
  // Initialize multi-select dropdown toggle behavior
  initMultiSelectDropdowns();
});
