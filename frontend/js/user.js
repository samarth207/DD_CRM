// ===== MODAL AND NOTIFICATION HELPERS =====
// Show loading overlay
function showLoading(message = 'Processing...', submessage = 'Please wait') {
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
  } else if (type === 'info') {
    toast.style.borderLeftColor = '#3b82f6';
    icon.className = 'fas fa-info-circle';
    icon.style.color = '#3b82f6';
    toastTitle.textContent = title || 'Info';
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

// ===== BROCHURES =====
// Load brochures on dashboard
let allBrochures = [];
document.addEventListener('DOMContentLoaded', loadBrochures);

async function loadBrochures() {
  const listDiv = document.getElementById('brochures-list');
  if (!listDiv) return;
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/brochures`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const brochures = await response.json();
    allBrochures = brochures;
    
    // Populate university and course filters
    populateFilters(brochures);
    
    // Display brochures
    displayBrochures(brochures);
  } catch (error) {
    listDiv.innerHTML = '<p style="color: #e11d48; font-size: 14px; text-align: center; padding: 20px 0;">Error loading brochures.</p>';
    console.error('Error loading brochures:', error);
  }
}

function populateFilters(brochures) {
  const univSelect = document.getElementById('filter-university');
  if (!univSelect) return;
  
  // Get unique universities
  const universities = [...new Set(brochures.map(b => b.university))].sort();
  
  univSelect.innerHTML = '<option value="">Select University</option>';
  universities.forEach(u => {
    univSelect.innerHTML += `<option value="${u}">${u}</option>`;
  });
  
  // Add event listener
  univSelect.addEventListener('change', filterBrochures);
}

function filterBrochures() {
  const univFilter = document.getElementById('filter-university').value;
  
  // Show section if university is selected
  const brochuresSection = document.getElementById('brochures-section');
  if (univFilter) {
    brochuresSection.style.display = 'block';
  }
  
  let filtered = allBrochures;
  if (univFilter) {
    filtered = filtered.filter(b => b.university === univFilter);
  }
  
  displayBrochures(filtered);
}

function displayBrochures(brochures) {
  const listDiv = document.getElementById('brochures-list');
  if (!listDiv) return;
  
  if (Array.isArray(brochures) && brochures.length > 0) {
    listDiv.innerHTML = '';
    // Group by university
    const grouped = {};
    brochures.forEach(b => {
      if (!grouped[b.university]) grouped[b.university] = [];
      grouped[b.university].push(b);
    });
    
    Object.keys(grouped).sort().forEach(univ => {
      const univId = 'univ-' + univ.replace(/[^a-z0-9]/gi, '_');
      const courseCount = grouped[univ].length;
      
      const univDiv = document.createElement('div');
      univDiv.className = 'brochure-university';
      univDiv.style.cssText = 'margin-bottom:16px; border:1px solid #e5e7eb; border-radius:8px; background:white; overflow:hidden;';
      
      // University header (collapsible)
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#f9fafb; cursor:pointer; border-bottom:1px solid #e5e7eb;';
      headerDiv.onclick = () => toggleUniversityBrochures(univId);
      headerDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fas fa-university" style="color:#2563eb;"></i>
          <h4 style="margin:0; color:#111827; font-size:15px;">${univ}</h4>
          <span style="background:#dbeafe; color:#1e40af; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">${courseCount} ${courseCount === 1 ? 'Course' : 'Courses'}</span>
        </div>
        <i id="${univId}-icon" class="fas fa-chevron-down" style="color:#6b7280; transition:transform 0.3s;"></i>
      `;
      univDiv.appendChild(headerDiv);
      
      // Courses container (collapsible)
      const coursesDiv = document.createElement('div');
      coursesDiv.id = univId;
      coursesDiv.style.cssText = 'max-height:0; overflow:hidden; transition:max-height 0.3s ease-out;';
      
      const coursesInner = document.createElement('div');
      coursesInner.style.cssText = 'padding:12px;';
      
      grouped[univ].forEach(brochure => {
        const item = document.createElement('div');
        item.className = 'brochure-item';
        item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border:1px solid #e5e7eb; border-radius:6px; margin-bottom:8px; background:#fafafa; transition:all 0.2s;';
        item.onmouseenter = (e) => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.borderColor = '#bfdbfe'; };
        item.onmouseleave = (e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#e5e7eb'; };
        item.innerHTML = `
          <span style="font-weight:500; color:#374151; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-book" style="color:#6366f1; font-size:12px;"></i>
            ${brochure.course}
          </span>
          <div style="display:flex; gap:8px;">
            <a href="${BASE_URL}/${brochure.filePath}" target="_blank" class="btn btn-secondary" style="font-size:12px; padding:6px 12px;"><i class="fas fa-eye"></i> View</a>
            <button onclick="downloadBrochure('${brochure.filePath}', '${brochure.university}-${brochure.course}-brochure.pdf')" class="btn btn-primary" style="font-size:12px; padding:6px 12px;"><i class="fas fa-download"></i> Download</button>
          </div>
        `;
        coursesInner.appendChild(item);
      });
      
      coursesDiv.appendChild(coursesInner);
      univDiv.appendChild(coursesDiv);
      listDiv.appendChild(univDiv);
    });
  } else {
    listDiv.innerHTML = '<p style="color: #9ca3af; font-size: 14px; text-align: center; padding: 20px 0;">No brochures match your selection.</p>';
  }
}

function toggleUniversityBrochures(univId) {
  const container = document.getElementById(univId);
  const icon = document.getElementById(univId + '-icon');
  
  if (container.style.maxHeight === '0px' || !container.style.maxHeight) {
    // Expand
    container.style.maxHeight = container.scrollHeight + 'px';
    icon.style.transform = 'rotate(180deg)';
  } else {
    // Collapse
    container.style.maxHeight = '0px';
    icon.style.transform = 'rotate(0deg)';
  }
}

function downloadBrochure(filePath, fileName) {
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
      console.error('Error downloading brochure:', error);
      showToast('Download Failed', 'Error downloading brochure', 'error');
    });
}

async function downloadAllBrochures() {
  try {
    const token = getToken();
    if (!token) {
      showToast('Login Required', 'Please login to download brochures', 'warning');
      return;
    }

    // Show loading indicator
    const button = event.target.closest('button');
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing ZIP...';

    const response = await fetch(`${API_URL}/admin/brochures/download-all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to download brochures');
    }

    // Get the blob from response
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brochures.zip';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Reset button
    button.disabled = false;
    button.innerHTML = originalHTML;
    
    // Show success message
    showToast('Download Complete', 'All brochures downloaded successfully!', 'success');
  } catch (error) {
    console.error('Error downloading all brochures:', error);
    showToast('Download Failed', 'Error downloading brochures: ' + error.message, 'error');
    
    // Reset button in case of error
    const button = event.target.closest('button');
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-download"></i> Download All as ZIP';
  }
}

async function downloadBulkBrochures() {
  const univFilter = document.getElementById('filter-university').value;
  if (!univFilter) {
    showToast('Selection Required', 'Please select a university to download all its brochures.', 'warning');
    return;
  }
  
  const filtered = allBrochures.filter(b => b.university === univFilter);
  if (filtered.length === 0) {
    showToast('No Brochures', 'No brochures found for this university.', 'warning');
    return;
  }
  
  showLoading('Downloading Brochures', `Preparing ${filtered.length} brochure(s) for ${univFilter}...`);
  
  // Download each brochure with staggered timing
  filtered.forEach((brochure, index) => {
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = `${BASE_URL}/${brochure.filePath}`;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, index * 500); // Stagger downloads by 500ms
  });
  
  // Hide loading after downloads start
  await new Promise(resolve => setTimeout(resolve, 1000));
  hideLoading();
  showToast('Download Started', `Downloading ${filtered.length} brochure(s)...`, 'info');
}

// Check authentication
const user = getUser();
if (!user || user.role !== 'user') {
  window.location.href = 'index.html';
}

let allLeads = [];
let currentLead = null;

// Initialize everything after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Initializing user dashboard');
  
  // Set user info
  document.getElementById('user-name').textContent = user.name;
  if (document.getElementById('user-name-sidebar')) {
    document.getElementById('user-name-sidebar').textContent = user.name;
    // Set avatar initial
    const avatar = document.querySelector('.sidebar-user-avatar');
    if (avatar) {
      avatar.textContent = user.name.charAt(0).toUpperCase();
    }
  }
  
  // Sidebar navigation
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  console.log('Found sidebar nav items:', navItems.length);
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      console.log('Sidebar clicked:', section);
      
      // Update active state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Scroll to section
      if (section === 'dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (section === 'leads') {
        const leadsSection = document.getElementById('leads-section');
        if (leadsSection) {
          const yOffset = -80;
          const y = leadsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      } else if (section === 'brochures') {
        const brochuresSection = document.getElementById('brochures-section');
        if (brochuresSection) {
          brochuresSection.style.display = 'block';
          const yOffset = -80;
          const y = brochuresSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      } else if (section === 'analytics') {
        const analyticsSection = document.getElementById('analytics-section');
        if (analyticsSection) {
          const yOffset = -80;
          const y = analyticsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    });
  });
  
  // Load leads after DOM is ready
  loadLeads();
});

async function loadLeads() {
  try {
    const response = await apiCall('/leads');
    const data = await response.json();
    
    if (response.ok) {
      allLeads = data;
      updateStats();
      displayLeads();
    }
  } catch (error) {
    console.error('Error loading leads:', error);
  }
}

function updateStats() {
  const stats = {
    total: allLeads.length,
    fresh: 0,
    followup: 0,
    enrolled: 0
  };
  
  allLeads.forEach(lead => {
    if (lead.status === 'Fresh') stats.fresh++;
    if (lead.status === 'Follow up') stats.followup++;
    if (lead.status === 'Enrolled') stats.enrolled++;
  });
  
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-new').textContent = stats.fresh;
  document.getElementById('stat-hot').textContent = stats.followup;
  document.getElementById('stat-closed').textContent = stats.enrolled;
  
  updateAnalytics();
}

let userStatusChart = null;

function updateAnalytics() {
  // Status distribution
  const statusBreakdown = {};
  allLeads.forEach(lead => {
    const status = lead.status || 'Unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });
  
  // Use the new updateUserStatusChart function
  updateUserStatusChart(statusBreakdown);
  
  // Performance metrics
  const enrolled = allLeads.filter(l => l.status === 'Enrolled').length;
  const conversionRate = allLeads.length > 0 ? ((enrolled / allLeads.length) * 100).toFixed(1) : 0;
  document.getElementById('conversion-rate').textContent = conversionRate + '%';
  
  const totalFollowups = allLeads.reduce((sum, lead) => sum + (lead.statusHistory?.length || 0), 0);
  const avgFollowups = allLeads.length > 0 ? (totalFollowups / allLeads.length).toFixed(1) : 0;
  document.getElementById('avg-followups').textContent = avgFollowups;
  
  const activeLeads = allLeads.filter(l => 
    l.status !== 'Enrolled' && 
    l.status !== 'Junk/not interested'
  ).length;
  document.getElementById('active-leads').textContent = activeLeads;
  
  // Dashboard Recent Activity: Shows top 5 URGENT leads requiring immediate attention
  // (Fresh, Follow up, Request call back) - sorted by most recent update
  // This helps users quickly identify which leads need action today
  const dashboardActivity = document.getElementById('recent-activity-dashboard');
  if (dashboardActivity) {
    const urgentLeads = allLeads
      .filter(l => l.status === 'Follow up' || l.status === 'Request call back' || l.status === 'Fresh')
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);
    
    if (urgentLeads.length > 0) {
      dashboardActivity.innerHTML = '';
      urgentLeads.forEach(lead => {
        const item = document.createElement('div');
        item.className = 'recent-activity-item';
        item.style.cssText = 'padding: 10px; border-left: 3px solid #6366f1; background: #f9fafb; border-radius: 4px; cursor: pointer; transition: all 0.2s;';
        item.innerHTML = `
          <div style="font-weight: 500; font-size: 14px; margin-bottom: 4px;">${lead.name || 'Unknown'}</div>
          <div style="font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="lead-status status-${(lead.status||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}" style="font-size: 11px; padding: 2px 6px;">${lead.status || 'N/A'}</span>
            <span>${lead.contact || 'No contact'}</span>
          </div>
        `;
        item.addEventListener('mouseover', () => item.style.background = '#f3f4f6');
        item.addEventListener('mouseout', () => item.style.background = '#f9fafb');
        item.addEventListener('click', () => openLeadModal(lead));
        dashboardActivity.appendChild(item);
      });
    } else {
      dashboardActivity.innerHTML = '<p style="color: #9ca3af; font-size: 14px; text-align: center; padding: 20px 0;">No urgent leads</p>';
    }
  }
  
  // Recent activity section removed - only dashboard activity needed
}

function displayLeads() {
  const filterStatus = document.getElementById('filter-status').value;
  const filterSearch = document.getElementById('filter-search').value.toLowerCase();
  
  const filteredLeads = allLeads.filter(lead => {
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    const matchesSearch = !filterSearch || 
      (lead.name && lead.name.toLowerCase().includes(filterSearch)) ||
      (lead.email && lead.email.toLowerCase().includes(filterSearch)) ||
      (lead.city && lead.city.toLowerCase().includes(filterSearch)) ||
      (lead.university && lead.university.toLowerCase().includes(filterSearch)) ||
      (lead.course && lead.course.toLowerCase().includes(filterSearch)) ||
      (lead.profession && lead.profession.toLowerCase().includes(filterSearch));
    
    return matchesStatus && matchesSearch;
  });
  
  const container = document.getElementById('leads-container');
  container.innerHTML = '';
  
  // Update leads count
  const leadsCount = document.getElementById('leads-count');
  if (leadsCount) {
    leadsCount.textContent = `${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''}`;
  }
  
  if (filteredLeads.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 0;">No leads found</p>';
    return;
  }
  
  // Pagination: show 20 leads at a time
  const leadsPerPage = 20;
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  let currentPage = window.currentLeadsPage || 1;
  
  // Ensure current page is valid
  if (currentPage > totalPages) currentPage = 1;
  window.currentLeadsPage = currentPage;
  
  const startIdx = (currentPage - 1) * leadsPerPage;
  const endIdx = startIdx + leadsPerPage;
  const leadsToShow = filteredLeads.slice(startIdx, endIdx);
  
  // Render leads
  leadsToShow.forEach(lead => {
    const leadCard = document.createElement('div');
    leadCard.className = 'lead-card';
    leadCard.onclick = () => openLeadModal(lead);
    
    leadCard.innerHTML = `
      <div class="lead-header">
        <div class="lead-name">${lead.name}</div>
        <span class="lead-status status-${(lead.status||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}">${lead.status}</span>
      </div>
      <div class="lead-info">
        <div><strong>Contact:</strong> ${lead.contact || 'N/A'}</div>
        <div><strong>Email:</strong> ${lead.email || 'N/A'}</div>
        <div><strong>City:</strong> ${lead.city || 'N/A'}</div>
        <div><strong>University:</strong> ${lead.university || 'N/A'}</div>
        <div><strong>Course:</strong> ${lead.course || 'N/A'}</div>
        <div><strong>Profession:</strong> ${lead.profession || 'N/A'}</div>
      </div>
    `;
    
    container.appendChild(leadCard);
  });
  
  // Add pagination controls if needed
  if (totalPages > 1) {
    const paginationDiv = document.createElement('div');
    paginationDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      window.currentLeadsPage = currentPage - 1;
      displayLeads();
      document.getElementById('leads-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollBy({ top: -80, behavior: 'smooth' });
    };
    paginationDiv.appendChild(prevBtn);
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.style.cssText = 'color: #6b7280; font-size: 14px; font-weight: 500; padding: 0 16px;';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationDiv.appendChild(pageInfo);
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      window.currentLeadsPage = currentPage + 1;
      displayLeads();
      document.getElementById('leads-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollBy({ top: -80, behavior: 'smooth' });
    };
    paginationDiv.appendChild(nextBtn);
    
    container.appendChild(paginationDiv);
  }
}

async function openLeadModal(lead) {
  currentLead = lead;
  document.getElementById('modal-lead-name').textContent = lead.name;
  document.getElementById('modal-lead-contact').textContent = lead.contact || 'N/A';
  document.getElementById('modal-lead-email').textContent = lead.email || 'N/A';
  document.getElementById('modal-lead-city').textContent = lead.city || 'N/A';
  document.getElementById('modal-lead-university').textContent = lead.university || 'N/A';
  document.getElementById('modal-lead-course').textContent = lead.course || 'N/A';
  document.getElementById('modal-lead-profession').textContent = lead.profession || 'N/A';
  document.getElementById('modal-lead-status').value = lead.status;

  // Load all available brochures (not just for this lead's course/university)
  const brochureDiv = document.getElementById('modal-lead-brochure');
  brochureDiv.innerHTML = '<span style="color:#9ca3af;">Loading brochures...</span>';
  
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/brochures`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allBrochures = await response.json();
    
    if (Array.isArray(allBrochures) && allBrochures.length > 0) {
      // Build brochure interface with filters
      let brochureHtml = `
        <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
          <h4 style="margin:0 0 10px 0; color:#1e293b; font-size:14px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-book-open" style="color:#6366f1;"></i>
            Available Brochures for Download
          </h4>
          
          <div style="margin-bottom:12px; display:flex; gap:8px;">
            <select id="modal-brochure-filter-univ" onchange="filterModalBrochures()" style="flex:1; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; background:white;">
              <option value="">All Universities</option>
            </select>
            <select id="modal-brochure-filter-course" onchange="filterModalBrochures()" style="flex:1; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; background:white;">
              <option value="">All Courses</option>
            </select>
          </div>
          
          <div id="modal-brochure-list" style="max-height:300px; overflow-y:auto; background:white; border:1px solid #e2e8f0; border-radius:6px; padding:8px;">
            <!-- Brochures will be populated here -->
          </div>
        </div>
      `;
      brochureDiv.innerHTML = brochureHtml;
      
      // Store brochures globally for filtering
      window.modalBrochures = allBrochures;
      
      // Populate filter dropdowns
      const universities = [...new Set(allBrochures.map(b => b.university))].sort();
      const courses = [...new Set(allBrochures.map(b => b.course))].sort();
      
      const univSelect = document.getElementById('modal-brochure-filter-univ');
      universities.forEach(u => {
        univSelect.innerHTML += `<option value="${u}">${u}</option>`;
      });
      
      const courseSelect = document.getElementById('modal-brochure-filter-course');
      courses.forEach(c => {
        courseSelect.innerHTML += `<option value="${c}">${c}</option>`;
      });
      
      // Display all brochures initially
      displayModalBrochures(allBrochures);
      
    } else {
      brochureDiv.innerHTML = '<span style="color:#e11d48;">No brochures available in the system.</span>';
    }
  } catch (error) {
    brochureDiv.innerHTML = '<span style="color:#e11d48;">Error loading brochures.</span>';
    console.error('Error loading brochures:', error);
  }

  // WhatsApp message button
  const whatsappDiv = document.getElementById('modal-lead-whatsapp');
  if (lead.contact) {
    // Get logged-in user's name
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = userData.name || 'DD CRM Team';
    
    const message = encodeURIComponent(
      `Hello ${lead.name},\n\nThank you for your interest in our courses. I've attached course brochures for your reference.\n\nIf you have any questions, feel free to reply here.\n\nBest regards,\n${userName}`
    );
    const phone = lead.contact.replace(/\D/g, '');
    // Use whatsapp:// protocol for desktop app integration
    let waUrl = `whatsapp://send?phone=${phone}&text=${message}`;
    whatsappDiv.innerHTML = `<a href="${waUrl}" class="btn btn-success" style="text-decoration:none;"><i class="fab fa-whatsapp"></i> Send WhatsApp Message</a>`;
  } else {
    whatsappDiv.innerHTML = '<span style="color:#e11d48;">No contact number available for WhatsApp.</span>';
  }

  displayStatusHistory(lead.statusHistory || []);
  displayNotes(lead.notes);
  
  // Display next call date if exists
  displayFollowUpSchedule(lead.nextCallDateTime);
  
  document.getElementById('lead-modal').style.display = 'flex';
}

function displayFollowUpSchedule(nextCallDateTime) {
  const input = document.getElementById('modal-followup-datetime');
  const display = document.getElementById('current-followup-display');
  const displayTime = document.getElementById('followup-display-time');
  
  if (nextCallDateTime) {
    // Convert to local datetime format for input
    const date = new Date(nextCallDateTime);
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    input.value = localDateTime;
    
    // Show scheduled time
    displayTime.textContent = date.toLocaleString();
    display.style.display = 'block';
  } else {
    input.value = '';
    display.style.display = 'none';
  }
}

function closeModal() {
  document.getElementById('lead-modal').style.display = 'none';
  document.getElementById('new-note').value = '';
  currentLead = null;
}

// Global escape key handler for modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const leadModal = document.getElementById('lead-modal');
    if (leadModal && leadModal.style.display !== 'none') {
      closeModal();
    }
  }
});

// Quick filter function
function quickFilter(status) {
  console.log('Quick filter clicked:', status);
  window.currentLeadsPage = 1; // Reset pagination
  document.getElementById('filter-status').value = status;
  document.getElementById('filter-search').value = '';
  displayLeads();
  
  // Scroll to leads section with a small delay
  requestAnimationFrame(() => {
    const leadsSection = document.getElementById('leads-section');
    if (leadsSection) {
      const yOffset = -80; // Offset for fixed header
      const y = leadsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      console.log('Scrolled to leads section');
    } else {
      console.error('Leads section not found');
    }
  });
}

// Clear filters function
function clearFilters() {
  window.currentLeadsPage = 1; // Reset pagination
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-search').value = '';
  displayLeads();
}

function displayStatusHistory(history) {
  const container = document.getElementById('status-history-container');
  container.innerHTML = '';
  
  if (!history || history.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No status changes yet</p>';
    return;
  }
  
  // Sort by date (newest first)
  const sortedHistory = [...history].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  
  sortedHistory.forEach(entry => {
    const historyItem = document.createElement('div');
    historyItem.className = 'note-item';
    historyItem.innerHTML = `
      <div class="note-content"><strong>Status changed to:</strong> <span class="lead-status status-${(entry.status||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}">${entry.status}</span></div>
      <div class="note-date">${new Date(entry.changedAt).toLocaleString()}</div>
    `;
    container.appendChild(historyItem);
  });
}

function displayNotes(notes) {
  const container = document.getElementById('notes-container');
  container.innerHTML = '';
  
  if (notes.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No notes yet</p>';
    return;
  }
  
  // Sort notes by date (newest first)
  const sortedNotes = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  sortedNotes.forEach(note => {
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.innerHTML = `
      <div class="note-content">${note.content}</div>
      <div class="note-date">${new Date(note.createdAt).toLocaleString()}</div>
    `;
    container.appendChild(noteItem);
  });
}

async function updateLeadStatus() {
  if (!currentLead) return;
  
  const newStatus = document.getElementById('modal-lead-status').value;
  
  try {
    const response = await apiCall(`/leads/${currentLead._id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update local data
      const index = allLeads.findIndex(l => l._id === currentLead._id);
      if (index !== -1) {
        allLeads[index] = data;
      }
      
      currentLead = data;
      updateStats();
      displayLeads();
      displayStatusHistory(data.statusHistory || []);
      
      showMessage('Status updated successfully!', 'success');
    }
  } catch (error) {
    console.error('Error updating status:', error);
    showMessage('Failed to update status', 'error');
  }
}

async function addNote() {
  if (!currentLead) return;
  
  const noteContent = document.getElementById('new-note').value.trim();
  
  if (!noteContent) {
    showMessage('Please enter a note', 'error');
    return;
  }
  
  try {
    const response = await apiCall(`/leads/${currentLead._id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content: noteContent })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update local data
      const index = allLeads.findIndex(l => l._id === currentLead._id);
      if (index !== -1) {
        allLeads[index] = data;
      }
      
      currentLead = data;
      displayNotes(data.notes);
      displayLeads();
      
      document.getElementById('new-note').value = '';
      showMessage('Note added successfully!', 'success');
    }
  } catch (error) {
    console.error('Error adding note:', error);
    showMessage('Failed to add note', 'error');
  }
}

// Event listeners for filters
document.getElementById('filter-status').addEventListener('change', () => {
  window.currentLeadsPage = 1; // Reset pagination on filter change
  displayLeads();
});
document.getElementById('filter-search').addEventListener('input', () => {
  window.currentLeadsPage = 1; // Reset pagination on search
  displayLeads();
});

// Close modal when clicking outside
document.getElementById('lead-modal').addEventListener('click', (e) => {
  if (e.target.id === 'lead-modal') {
    closeModal();
  }
});

function showMessage(message, type) {
  // Create or update a message element
  let messageDiv = document.getElementById('user-message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'user-message';
    messageDiv.className = 'message';
    messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2000; min-width: 250px; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    document.body.appendChild(messageDiv);
  }
  
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  
  if (type === 'success') {
    messageDiv.style.backgroundColor = '#d4edda';
    messageDiv.style.color = '#155724';
    messageDiv.style.border = '1px solid #c3e6cb';
  } else {
    messageDiv.style.backgroundColor = '#f8d7da';
    messageDiv.style.color = '#721c24';
    messageDiv.style.border = '1px solid #f5c6cb';
  }
  
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 4000);
}

// ============ Date Filter Functions for User Dashboard ============

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

// User status chart date filter
document.addEventListener('DOMContentLoaded', () => {
  const statusFilter = document.getElementById('user-status-date-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      const customRange = document.getElementById('user-status-custom-date-range');
      if (this.value === 'custom') {
        customRange.style.display = 'flex';
      } else {
        customRange.style.display = 'none';
        applyUserStatusDateFilter(this.value);
      }
    });
  }
});

function applyUserStatusDateFilter(filterValue) {
  if (!allLeads || allLeads.length === 0) return;
  
  const dateRange = getDateRange(filterValue);
  const filteredLeads = filterLeadsByDateRange(allLeads, dateRange);
  
  // Calculate status breakdown
  const statusBreakdown = {};
  filteredLeads.forEach(lead => {
    const status = lead.status || 'Unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });
  
  // Update chart with filtered data
  updateUserStatusChart(statusBreakdown);
}

function applyUserStatusCustomDateFilter() {
  const startDate = document.getElementById('user-status-start-date').value;
  const endDate = document.getElementById('user-status-end-date').value;
  
    if (!startDate || !endDate) {
      showToast('Date Required', 'Please select both start and end dates', 'warning');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      showToast('Invalid Date Range', 'Start date must be before end date', 'warning');
      return;
    }  const dateRange = getDateRange('custom', startDate, endDate);
  const filteredLeads = filterLeadsByDateRange(allLeads, dateRange);
  
  const statusBreakdown = {};
  filteredLeads.forEach(lead => {
    const status = lead.status || 'Unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });
  
  updateUserStatusChart(statusBreakdown);
}

// Separate function to update user status chart
function updateUserStatusChart(statusBreakdown) {
  const ctx = document.getElementById('user-status-chart');
  if (!ctx) return;
  
  const labels = Object.keys(statusBreakdown);
  const data = Object.values(statusBreakdown);
  
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
  
  if (userStatusChart) {
    userStatusChart.destroy();
  }
  
  userStatusChart = new Chart(ctx, {
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
      }
    }
  });
}

// ============ Follow-up Scheduling and Reminder System ============

async function scheduleFollowUp() {
  if (!currentLead) return;
  
  const dateTimeInput = document.getElementById('modal-followup-datetime');
  const dateTimeValue = dateTimeInput.value;
  
  if (!dateTimeValue) {
    showToast('Date Required', 'Please select a date and time for the follow-up', 'warning');
    return;
  }
  
  const followUpDate = new Date(dateTimeValue);
  const now = new Date();
  
  if (followUpDate <= now) {
    showToast('Invalid Date', 'Follow-up time must be in the future', 'warning');
    return;
  }
  
  try {
    const response = await apiCall(`/leads/${currentLead._id}`, {
      method: 'PUT',
      body: JSON.stringify({ nextCallDateTime: followUpDate.toISOString() })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update local data
      const index = allLeads.findIndex(l => l._id === currentLead._id);
      if (index !== -1) {
        allLeads[index] = data;
      }
      
      currentLead = data;
      displayFollowUpSchedule(data.nextCallDateTime);
      showMessage('Follow-up reminder scheduled successfully!', 'success');
      
      // Start checking for this reminder
      checkReminders();
    }
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    showMessage('Failed to schedule follow-up', 'error');
  }
}

async function clearFollowUp() {
  if (!currentLead) return;
  
  try {
    const response = await apiCall(`/leads/${currentLead._id}`, {
      method: 'PUT',
      body: JSON.stringify({ nextCallDateTime: null })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update local data
      const index = allLeads.findIndex(l => l._id === currentLead._id);
      if (index !== -1) {
        allLeads[index] = data;
      }
      
      currentLead = data;
      displayFollowUpSchedule(null);
      showMessage('Follow-up reminder cleared', 'success');
    }
  } catch (error) {
    console.error('Error clearing follow-up:', error);
    showMessage('Failed to clear follow-up', 'error');
  }
}

// Reminder checking system
let reminderCheckInterval = null;
let shownReminders = new Set(); // Track shown reminders to avoid duplicates
let snoozedReminders = new Map(); // Track snoozed reminders
let activeReminders = []; // Store all active reminders for notification panel

function startReminderSystem() {
  // Check every 30 seconds
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval);
  }
  
  reminderCheckInterval = setInterval(() => {
    checkReminders();
  }, 30000);
  
  // Check immediately on start
  checkReminders();
}

function checkReminders() {
  const now = new Date();
  
  // Clear old active reminders
  activeReminders.length = 0;
  
  allLeads.forEach(lead => {
    if (!lead.nextCallDateTime) return;
    
    const followUpTime = new Date(lead.nextCallDateTime);
    const timeDiff = followUpTime - now;
    const leadKey = lead._id + '-' + lead.nextCallDateTime;
    
    // Check if snoozed
    const snoozeTime = snoozedReminders.get(lead._id);
    if (snoozeTime && now < snoozeTime) {
      return; // Still snoozed
    }
    
    // Add to active reminders if within 5 minutes of follow-up time
    if (timeDiff > 0 && timeDiff <= 300000) {
      activeReminders.push({
        lead: lead,
        isOverdue: false,
        time: followUpTime
      });
      
      // Show popup for first-time reminder
      if (!shownReminders.has(leadKey)) {
        showReminderPopup(lead);
        shownReminders.add(leadKey);
      }
    }
    
    // Add to active reminders if overdue (up to 1 hour)
    if (timeDiff < 0 && timeDiff > -3600000) {
      activeReminders.push({
        lead: lead,
        isOverdue: true,
        time: followUpTime
      });
      
      // Show popup for first-time overdue reminder
      if (!shownReminders.has(leadKey)) {
        showReminderPopup(lead, true);
        shownReminders.add(leadKey);
      }
    }
  });
  
  // Update notification panel
  updateNotificationPanel();
}

let currentReminderLead = null;

function showReminderPopup(lead, isOverdue = false) {
  currentReminderLead = lead;
  
  const popup = document.getElementById('reminder-popup');
  const message = document.getElementById('reminder-message');
  const leadName = document.getElementById('reminder-lead-name');
  const leadContact = document.getElementById('reminder-lead-contact');
  const leadEmail = document.getElementById('reminder-lead-email');
  
  if (isOverdue) {
    message.textContent = 'Overdue follow-up! You missed this lead:';
  } else {
    message.textContent = 'Time to follow up with this lead:';
  }
  
  leadName.textContent = lead.name || 'Unknown';
  leadContact.textContent = lead.contact || 'N/A';
  leadEmail.textContent = lead.email || 'N/A';
  
  popup.style.display = 'block';
  
  // Play notification sound if available
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGJ0fDRgTYIGGS15+mZTgwOTKXh77BhGwU7k9buxXMpBSl+zO/aizsKE16y6eaoVRQKRp/g8r5sIQcxidHw0YE2CBhkteXnmU4MDkyl4e+wYRsFO5PW7sVzKQUpfszt2os7ChNesunn');
    audio.play().catch(() => {});
  } catch (e) {}
}

function closeReminderPopup() {
  const popup = document.getElementById('reminder-popup');
  popup.style.display = 'none';
  currentReminderLead = null;
}

function openLeadFromReminder() {
  if (!currentReminderLead) return;
  
  closeReminderPopup();
  
  // Fetch fresh lead data to ensure we have the latest
  const token = getToken();
  fetch(`${API_URL}/leads/${currentReminderLead._id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch lead');
    }
    return response.json();
  })
  .then(lead => {
    openLeadModal(lead);
  })
  .catch(error => {
    console.error('Error loading lead:', error);
    showMessage('Error loading lead details', 'error');
  });
}

function snoozeReminder() {
  if (!currentReminderLead) return;
  
  // Snooze for 15 minutes
  const snoozeUntil = new Date(Date.now() + 15 * 60 * 1000);
  snoozedReminders.set(currentReminderLead._id, snoozeUntil);
  
  // Remove from shown reminders so it can appear again after snooze
  const leadKey = currentReminderLead._id + '-' + currentReminderLead.nextCallDateTime;
  shownReminders.delete(leadKey);
  
  closeReminderPopup();
  showMessage('Reminder snoozed for 15 minutes', 'success');
}

// Notification Panel Functions
function toggleNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (panel.style.display === 'block') {
    panel.style.display = 'none';
  } else {
    panel.style.display = 'block';
    updateNotificationPanel();
  }
}

function closeNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  panel.style.display = 'none';
}

function updateNotificationPanel() {
  const badge = document.getElementById('notification-badge');
  const list = document.getElementById('notification-list');
  
  // Update badge
  if (activeReminders.length > 0) {
    badge.textContent = activeReminders.length;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
  
  // Update notification list
  if (activeReminders.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No pending reminders</div>';
  } else {
    list.innerHTML = activeReminders.map(reminder => {
      const timeStr = new Date(reminder.time).toLocaleString();
      const statusClass = reminder.isOverdue ? 'overdue' : 'upcoming';
      const statusText = reminder.isOverdue ? 'OVERDUE' : 'UPCOMING';
      
      return `
        <div class="notification-item ${statusClass}" onclick="openLeadFromNotification('${reminder.lead._id}')">
          <div class="notification-header">
            <span class="notification-status">${statusText}</span>
            <span class="notification-time">${timeStr}</span>
          </div>
          <div class="notification-body">
            <strong>${reminder.lead.name}</strong><br>
            <small>${reminder.lead.contact} • ${reminder.lead.email}</small>
          </div>
        </div>
      `;
    }).join('');
  }
}

function openLeadFromNotification(leadId) {
  // Close notification panel
  document.getElementById('notification-panel').style.display = 'none';
  
  // Fetch and open the lead
  const token = getToken();
  fetch(`${API_URL}/leads/${leadId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch lead');
    }
    return response.json();
  })
  .then(lead => {
    openLeadModal(lead);
  })
  .catch(error => {
    console.error('Error loading lead:', error);
    showMessage('Error loading lead details', 'error');
  });
}

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notification-panel');
  const bell = document.getElementById('notification-bell');
  
  if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target) && !e.target.closest('[onclick*="toggleNotificationPanel"]')) {
    panel.style.display = 'none';
  }
});

// Start reminder system when page loads
document.addEventListener('DOMContentLoaded', () => {
  startReminderSystem();
});

// Stop reminder system when page unloads
window.addEventListener('beforeunload', () => {
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval);
  }
});

// Function to display brochures in modal
function displayModalBrochures(brochures) {
  const listDiv = document.getElementById('modal-brochure-list');
  if (!listDiv) return;
  
  if (brochures.length === 0) {
    listDiv.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:12px; font-size:13px;">No brochures match your selection.</p>';
    return;
  }
  
  // Group by university
  const grouped = {};
  brochures.forEach(b => {
    if (!grouped[b.university]) grouped[b.university] = [];
    grouped[b.university].push(b);
  });
  
  listDiv.innerHTML = '';
  
  Object.keys(grouped).sort().forEach(univ => {
    const univSection = document.createElement('div');
    univSection.style.cssText = 'margin-bottom:10px;';
    
    const univHeader = document.createElement('div');
    univHeader.style.cssText = 'font-weight:600; color:#1e293b; font-size:13px; padding:6px 8px; background:#f1f5f9; border-radius:4px; margin-bottom:4px; display:flex; align-items:center; gap:6px;';
    univHeader.innerHTML = `<i class="fas fa-university" style="color:#6366f1; font-size:11px;"></i>${univ}`;
    univSection.appendChild(univHeader);
    
    grouped[univ].forEach(brochure => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px; border:1px solid #e2e8f0; border-radius:4px; margin-bottom:4px; background:#fafafa; transition:all 0.2s;';
      item.onmouseenter = (e) => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.borderColor = '#bfdbfe'; };
      item.onmouseleave = (e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#e2e8f0'; };
      
      item.innerHTML = `
        <span style="font-size:13px; color:#374151; display:flex; align-items:center; gap:6px;">
          <i class="fas fa-book" style="color:#6366f1; font-size:11px;"></i>
          ${brochure.course}
        </span>
        <div style="display:flex; gap:6px;">
          <a href="${BASE_URL}/${brochure.filePath}" target="_blank" class="btn btn-secondary" style="font-size:11px; padding:4px 10px;"><i class="fas fa-eye"></i> View</a>
          <button onclick="downloadBrochure('${brochure.filePath}', '${brochure.university}-${brochure.course}-brochure.pdf')" class="btn btn-primary" style="font-size:11px; padding:4px 10px;"><i class="fas fa-download"></i> Download</button>
        </div>
      `;
      
      univSection.appendChild(item);
    });
    
    listDiv.appendChild(univSection);
  });
}

// Function to filter brochures in modal
function filterModalBrochures() {
  if (!window.modalBrochures) return;
  
  const univFilter = document.getElementById('modal-brochure-filter-univ').value;
  const courseFilter = document.getElementById('modal-brochure-filter-course').value;
  
  let filtered = window.modalBrochures;
  
  if (univFilter) {
    filtered = filtered.filter(b => b.university === univFilter);
  }
  
  if (courseFilter) {
    filtered = filtered.filter(b => b.course === courseFilter);
  }
  
  displayModalBrochures(filtered);
}
