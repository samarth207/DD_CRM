// ===== MODAL AND NOTIFICATION HELPERS =====
// Live Update Polling System
let lastCheckTimestamp = Date.now();
let lastLeadCount = 0; // Track lead count to detect deletions
let updateCheckInterval = null;

// Start polling for updates
function startUpdatePolling() {
  // Check for updates every 15 seconds
  updateCheckInterval = setInterval(checkForUpdates, 15000);
  console.log('Live update polling started');
}

// Stop polling
function stopUpdatePolling() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

// Check for updates
async function checkForUpdates() {
  try {
    // Don't check for updates if a modal is open (user is editing)
    const leadModal = document.getElementById('lead-modal');
    if (leadModal && leadModal.style.display === 'flex') {
      return; // Skip this check, user is actively editing
    }
    
    const response = await apiCall(`/leads/check-updates?lastCheck=${lastCheckTimestamp}&lastCount=${lastLeadCount}`);
    
    // Handle auth errors - apiCall will redirect
    if (!response) return;
    
    if (response && response.ok) {
      const data = await response.json();
      if (data.hasUpdates) {
        const changeType = data.countChanged 
          ? (data.currentCount > lastLeadCount ? 'added' : 'removed')
          : 'updated';
        showUpdateNotification(data.updateCount || 1, changeType, data.countChanged);
        lastCheckTimestamp = data.latestTimestamp;
        lastLeadCount = data.currentCount;
      } else {
        // Update count even if no changes to stay in sync
        lastLeadCount = data.currentCount;
      }
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
    // Don't show error toast for background polling failures
  }
}

// Show update notification banner
function showUpdateNotification(updateCount, changeType = 'updated', countChanged = false) {
  const banner = document.getElementById('update-notification-banner');
  if (banner) {
    banner.style.display = 'block';
    // Update message with count and type
    const messageDiv = document.getElementById('update-notification-message');
    if (messageDiv) {
      let message = '';
      if (countChanged) {
        if (changeType === 'removed') {
          message = `Lead(s) have been removed by admin. Click to refresh and see the latest changes.`;
        } else {
          message = `New lead(s) have been assigned to you. Click to refresh and see them.`;
        }
      } else {
        message = `${updateCount} lead${updateCount > 1 ? 's have' : ' has'} been updated by admin. Click to refresh and see the latest changes.`;
      }
      messageDiv.textContent = message;
    }
  }
}

// Dismiss update notification
function dismissUpdateNotification() {
  const banner = document.getElementById('update-notification-banner');
  if (banner) {
    banner.style.display = 'none';
  }
  // Reset timestamp to current time to avoid showing the same notification again
  lastCheckTimestamp = Date.now();
}

// Refresh user data
function refreshUserData() {
  dismissUpdateNotification();
  // Reload leads data
  currentPage = 1;
  loadLeads();
  showToast('Data Refreshed', 'Your leads have been updated with the latest changes', 'success');
}

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

// Store current user ID for filtering
window.currentUserId = user.id || user._id;

let allLeads = [];
let currentLead = null;
let userNoActionFilterActive = false;
let userNoActionFilterConfig = { days: 7, startDate: null, endDate: null };

// Initialize everything after DOM is ready
// ===== TUTORIAL SYSTEM =====
let currentTutorialStep = 0;
const tutorialSteps = [
  {
    title: '📊 Dashboard Overview',
    description: 'This is your main dashboard showing quick stats about your leads. You can see total leads, fresh leads, and today\'s activity at a glance.',
    target: '.dashboard',
    position: 'center'
  },
  {
    title: '🔍 Search & Filters',
    description: 'Use these powerful filters to find exactly what you\'re looking for. Search by name, email, city, and filter by status, source, date range, or leads with no recent activity.',
    target: '.card:first-of-type',
    position: 'bottom'
  },
  {
    title: '📈 Status Cards',
    description: 'Quick filter buttons showing lead counts by status. Click any card to instantly filter your leads. The counts update dynamically based on your active filters!',
    target: '#status-filter-section',
    position: 'bottom'
  },
  {
    title: '📋 Your Leads',
    description: 'This is where all your assigned leads appear. Click on any lead to view details, add notes, change status, and make calls. Use the action buttons to manage leads efficiently.',
    target: '#leads-section',
    position: 'top'
  },
  {
    title: '✏️ Lead Details & Actions',
    description: 'We\'ve opened a lead for you! See how the modal shows all details. You can: 1) Update Status (Fresh, Follow up, Counselled, etc.) 2) Add Notes to track conversations 3) Record Call Details with duration 4) Update Contact Info (phone, email, city) 5) View Full History of all interactions. All changes save automatically!',
    target: '#lead-modal',
    position: 'center'
  },
  {
    title: '📄 Brochures Library',
    description: 'Access all marketing brochures here. Download PDFs or copy links to share with your leads instantly.',
    target: '#brochures-section',
    position: 'top'
  },
  {
    title: '📊 Analytics Dashboard',
    description: 'Track your performance with beautiful charts. See your lead distribution by status, source analysis, and conversion trends over time.',
    target: '#analytics-section',
    position: 'top'
  },
  {
    title: '🎯 Ready to Go!',
    description: 'You\'re all set! Start managing your leads like a pro. Remember, you can always access help from the sidebar. Good luck! 🚀',
    target: '.sidebar',
    position: 'right'
  }
];

function checkAndShowWelcome() {
  // Check if user has seen tutorial
  if (!user.hasSeenTutorial) {
    showWelcomeModal();
  }
}

function showWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  const userName = document.getElementById('welcome-user-name');
  if (modal && userName) {
    userName.textContent = `Hello, ${user.name}! 👋`;
    modal.style.display = 'flex';
  }
}

function startTutorial() {
  // Hide welcome modal
  const welcomeModal = document.getElementById('welcome-modal');
  if (welcomeModal) welcomeModal.style.display = 'none';
  
  // Reset tutorial
  currentTutorialStep = 0;
  
  // Show tutorial overlay and tooltip
  document.getElementById('tutorial-overlay').style.display = 'block';
  document.getElementById('tutorial-tooltip').style.display = 'block';
  
  // Show first step
  showTutorialStep(0);
}

function showTutorialStep(stepIndex) {
  if (stepIndex < 0 || stepIndex >= tutorialSteps.length) return;
  
  currentTutorialStep = stepIndex;
  const step = tutorialSteps[stepIndex];
  
  // Close lead modal when moving away from lead details step
  if (stepIndex !== 4) {
    const leadModal = document.getElementById('lead-modal');
    if (leadModal && leadModal.style.display === 'flex') {
      closeModal();
    }
  }
  
  // Update step indicator
  document.getElementById('tutorial-step-indicator').textContent = `Step ${stepIndex + 1} of ${tutorialSteps.length}`;
  document.getElementById('tutorial-title').textContent = step.title;
  document.getElementById('tutorial-description').textContent = step.description;
  
  // Show/hide previous button
  const prevBtn = document.getElementById('tutorial-prev-btn');
  if (stepIndex === 0) {
    prevBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'flex';
  }
  
  // Update next button text
  const nextBtn = document.getElementById('tutorial-next-btn');
  if (stepIndex === tutorialSteps.length - 1) {
    nextBtn.innerHTML = '<i class="fas fa-check"></i> Finish';
  } else {
    nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
  }
  
  // Remove previous highlights
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
  
  // Special handling for lead details step - open first lead if available
  if (stepIndex === 4 && allLeads && allLeads.length > 0) {
    // Open the first lead in the modal to demonstrate
    setTimeout(() => {
      openLeadModal(allLeads[0]);
      // After modal opens, highlight it
      setTimeout(() => {
        const leadModal = document.getElementById('lead-modal');
        if (leadModal) {
          const modalContent = leadModal.querySelector('.modal-content');
          if (modalContent) {
            modalContent.classList.add('tutorial-highlight');
            positionTooltip(modalContent, step.position);
          }
        }
      }, 300);
    }, 100);
    return; // Skip normal highlighting for this step
  }
  
  // Highlight target element
  const targetElement = document.querySelector(step.target);
  if (targetElement) {
    targetElement.classList.add('tutorial-highlight');
    
    // Scroll to element
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Position tooltip
    setTimeout(() => positionTooltip(targetElement, step.position), 300);
  }
}

function positionTooltip(targetElement, position) {
  const tooltip = document.getElementById('tutorial-tooltip');
  const rect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let top, left;
  
  switch(position) {
    case 'bottom':
      top = rect.bottom + 20;
      left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      break;
    case 'top':
      top = rect.top - tooltipRect.height - 20;
      left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      break;
    case 'right':
      top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
      left = rect.right + 20;
      break;
    case 'center':
    default:
      top = window.innerHeight / 2 - tooltipRect.height / 2;
      left = window.innerWidth / 2 - tooltipRect.width / 2;
      break;
  }
  
  // Keep tooltip within viewport
  top = Math.max(20, Math.min(top, window.innerHeight - tooltipRect.height - 20));
  left = Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20));
  
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function nextTutorialStep() {
  if (currentTutorialStep < tutorialSteps.length - 1) {
    showTutorialStep(currentTutorialStep + 1);
  } else {
    endTutorial();
  }
}

function previousTutorialStep() {
  if (currentTutorialStep > 0) {
    showTutorialStep(currentTutorialStep - 1);
  }
}

async function endTutorial() {
  // Hide tutorial UI
  document.getElementById('tutorial-overlay').style.display = 'none';
  document.getElementById('tutorial-tooltip').style.display = 'none';
  
  // Remove highlights
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
  
  // Mark tutorial as complete
  await markTutorialComplete();
  
  // Show success message
  showToast('Tutorial Complete! 🎉', 'You\'re ready to start managing your leads!', 'success');
}

async function skipTutorial() {
  // Hide welcome modal
  const welcomeModal = document.getElementById('welcome-modal');
  if (welcomeModal) welcomeModal.style.display = 'none';
  
  // Mark tutorial as complete (even though skipped)
  await markTutorialComplete();
}

async function markTutorialComplete() {
  try {
    const response = await apiCall('/auth/complete-tutorial', {
      method: 'PATCH'
    });
    
    if (response.ok) {
      // Update local user object
      user.hasSeenTutorial = true;
    }
  } catch (error) {
    console.error('Error marking tutorial complete:', error);
  }
}

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
  
  // Start live update polling
  startUpdatePolling();
  
  // Check if user needs to see welcome/tutorial (after a short delay for better UX)
  setTimeout(() => checkAndShowWelcome(), 800);
  
  // Wire up update notification buttons
  const refreshBtn = document.getElementById('refresh-data-btn');
  const dismissBtn = document.getElementById('dismiss-notification-btn');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshUserData);
  }
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', dismissUpdateNotification);
  }

  // No-action period change handler
  const userNoActionPeriod = document.getElementById('user-no-action-period');
  if (userNoActionPeriod) {
    userNoActionPeriod.addEventListener('change', () => {
      const customDates = document.getElementById('user-no-action-custom-dates');
      if (userNoActionPeriod.value === 'custom') {
        customDates.style.display = 'flex';
      } else {
        customDates.style.display = 'none';
      }
    });
  }
});

async function loadLeads() {
  try {
    // Load all leads without pagination for stats (limit set high)
    const response = await apiCall('/leads?limit=10000');
    
    // Handle auth errors separately - apiCall will redirect
    if (!response) return;
    
    const data = await response.json();
    
    if (response.ok) {
      allLeads = data.leads || data; // Support both new and old format
      lastLeadCount = allLeads.length; // Update count for change detection
      populateSourceFilter(allLeads);
      updateStats();
      updateStatusCounts(); // Update status filter counts
      displayLeads();
      // Start reminder system after leads are loaded
      startReminderSystem();
    } else {
      console.error('Error loading leads:', data.message);
      showToast('Error', data.message || 'Failed to load leads', 'error');
    }
  } catch (error) {
    console.error('Error loading leads:', error);
    showToast('Network Error', 'Failed to load leads. Please check your connection.', 'error');
  }
}

function updateStats() {
  // Stats cards removed, only update analytics
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

// Update status filter counts
function updateStatusCounts() {
  if (!allLeads) return;
  
  // Get filtered leads using the same logic as displayLeads
  const filterStatus = document.getElementById('filter-status').value;
  const filterSearch = document.getElementById('filter-search').value.toLowerCase();
  const filterSource = document.getElementById('filter-source').value;
  const filterDate = document.getElementById('filter-date').value;
  const filterCustomDate = document.getElementById('filter-custom-date').value;
  
  const filteredLeads = allLeads.filter(lead => {
    const matchesSource = !filterSource || (lead.source || 'Other') === filterSource;
    const matchesSearch = !filterSearch || 
      (lead.name && lead.name.toLowerCase().includes(filterSearch)) ||
      (lead.email && lead.email.toLowerCase().includes(filterSearch)) ||
      (lead.city && lead.city.toLowerCase().includes(filterSearch)) ||
      (lead.university && lead.university.toLowerCase().includes(filterSearch)) ||
      (lead.course && lead.course.toLowerCase().includes(filterSearch)) ||
      (lead.profession && lead.profession.toLowerCase().includes(filterSearch)) ||
      (lead.source && lead.source.toLowerCase().includes(filterSearch));
    
    let matchesDate = true;
    if (filterDate && lead.assignmentHistory && lead.assignmentHistory.length > 0) {
      const userAssignments = lead.assignmentHistory.filter(h => 
        h.toUser && (h.toUser._id === window.currentUserId || h.toUser === window.currentUserId)
      );
      
      if (userAssignments.length > 0) {
        const lastAssignment = userAssignments[userAssignments.length - 1];
        const assignmentDate = new Date(lastAssignment.changedAt || lead.createdAt);
        matchesDate = checkDateMatch(assignmentDate, filterDate, filterCustomDate);
      } else {
        const createdDate = new Date(lead.createdAt);
        matchesDate = checkDateMatch(createdDate, filterDate, filterCustomDate);
      }
    }
    
    const matchesNoAction = !userNoActionFilterActive || checkUserLeadNoAction(lead, userNoActionFilterConfig);
    return matchesSource && matchesSearch && matchesDate && matchesNoAction;
  });
  
  const statusCounts = {
    all: filteredLeads.length,
    'Fresh': 0,
    'Buffer fresh': 0,
    'Did not pick': 0,
    'Request call back': 0,
    'Follow up': 0,
    'Counselled': 0,
    'Interested in next batch': 0,
    'Registration fees paid': 0,
    'Enrolled': 0,
    'Junk/not interested': 0
  };
  
  filteredLeads.forEach(lead => {
    if (statusCounts[lead.status] !== undefined) {
      statusCounts[lead.status]++;
    }
  });
  
  // Update count elements
  const countEl = (id) => document.getElementById(`count-${id}`);
  if (countEl('all')) countEl('all').textContent = statusCounts.all;
  if (countEl('fresh')) countEl('fresh').textContent = statusCounts['Fresh'];
  if (countEl('buffer-fresh')) countEl('buffer-fresh').textContent = statusCounts['Buffer fresh'];
  if (countEl('did-not-pick')) countEl('did-not-pick').textContent = statusCounts['Did not pick'];
  if (countEl('request-call-back')) countEl('request-call-back').textContent = statusCounts['Request call back'];
  if (countEl('follow-up')) countEl('follow-up').textContent = statusCounts['Follow up'];
  if (countEl('counselled')) countEl('counselled').textContent = statusCounts['Counselled'];
  if (countEl('interested')) countEl('interested').textContent = statusCounts['Interested in next batch'];
  if (countEl('fees-paid')) countEl('fees-paid').textContent = statusCounts['Registration fees paid'];
  if (countEl('enrolled')) countEl('enrolled').textContent = statusCounts['Enrolled'];
  if (countEl('junk')) countEl('junk').textContent = statusCounts['Junk/not interested'];
}

// Populate source filter options dynamically
function populateSourceFilter(leads) {
  const sourceSelect = document.getElementById('filter-source');
  if (!sourceSelect || !Array.isArray(leads)) return;
  const sources = [...new Set(leads.map(l => l.source || 'Other'))].sort();
  const currentValue = sourceSelect.value;
  sourceSelect.innerHTML = '<option value="">All Sources</option>';
  sources.forEach(src => {
    const option = document.createElement('option');
    option.value = src;
    option.textContent = src;
    sourceSelect.appendChild(option);
  });
  // Preserve selection if still valid
  if (sources.includes(currentValue)) {
    sourceSelect.value = currentValue;
  }
}

function displayLeads() {
  const filterStatus = document.getElementById('filter-status').value;
  const filterSearch = document.getElementById('filter-search').value.toLowerCase();
  const filterSource = document.getElementById('filter-source').value;
  const filterDate = document.getElementById('filter-date').value;
  const filterCustomDate = document.getElementById('filter-custom-date').value;
  
  // Update status counts
  updateStatusCounts();
  
  const filteredLeads = allLeads.filter(lead => {
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    const matchesSource = !filterSource || (lead.source || 'Other') === filterSource;
    const matchesSearch = !filterSearch || 
      (lead.name && lead.name.toLowerCase().includes(filterSearch)) ||
      (lead.email && lead.email.toLowerCase().includes(filterSearch)) ||
      (lead.city && lead.city.toLowerCase().includes(filterSearch)) ||
      (lead.university && lead.university.toLowerCase().includes(filterSearch)) ||
      (lead.course && lead.course.toLowerCase().includes(filterSearch)) ||
      (lead.profession && lead.profession.toLowerCase().includes(filterSearch)) ||
      (lead.source && lead.source.toLowerCase().includes(filterSearch));
    
    // Date filtering based on assignment history
    let matchesDate = true;
    if (filterDate && lead.assignmentHistory && lead.assignmentHistory.length > 0) {
      // Get the most recent assignment date for this user
      const userAssignments = lead.assignmentHistory.filter(h => 
        h.toUser && (h.toUser._id === window.currentUserId || h.toUser === window.currentUserId)
      );
      
      if (userAssignments.length > 0) {
        const lastAssignment = userAssignments[userAssignments.length - 1];
        const assignmentDate = new Date(lastAssignment.changedAt || lead.createdAt);
        matchesDate = checkDateMatch(assignmentDate, filterDate, filterCustomDate);
      } else {
        // Fallback to createdAt if no assignment history
        const createdDate = new Date(lead.createdAt);
        matchesDate = checkDateMatch(createdDate, filterDate, filterCustomDate);
      }
    }
    
    const matchesNoAction = !userNoActionFilterActive || checkUserLeadNoAction(lead, userNoActionFilterConfig);
    return matchesStatus && matchesSource && matchesSearch && matchesDate && matchesNoAction;
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
    leadCard.onclick = (e) => {
      // Don't open modal if clicking copy buttons
      if (e.target.closest('.copy-icon') || e.target.closest('.copy-all-btn')) {
        e.stopPropagation();
        return;
      }
      openLeadModal(lead);
    };
    
    // Escape quotes in lead data for inline JSON
    const leadJson = JSON.stringify(lead).replace(/"/g, '&quot;');
    
    leadCard.innerHTML = `
      <div class="lead-header">
        <div class="lead-name">${lead.name}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="lead-status status-${(lead.status||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}">${lead.status}</span>
          <button class="copy-all-btn" onclick="event.stopPropagation(); copyAllLeadDetails(${leadJson})" title="Copy all details">
            <i class="fas fa-copy"></i> Copy All
          </button>
        </div>
      </div>
      <div class="lead-info">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span><strong>Contact:</strong> ${lead.contact || 'N/A'}</span>
          ${lead.contact ? `<i class="fas fa-copy copy-icon" onclick="event.stopPropagation(); copyToClipboard('${lead.contact}', 'Contact')" title="Copy contact"></i>` : ''}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span><strong>Email:</strong> ${lead.email || 'N/A'}</span>
          ${lead.email ? `<i class="fas fa-copy copy-icon" onclick="event.stopPropagation(); copyToClipboard('${lead.email}', 'Email')" title="Copy email"></i>` : ''}
        </div>
        <div><strong>City:</strong> ${lead.city || 'N/A'}</div>
        <div><strong>University:</strong> ${lead.university || 'N/A'}</div>
        <div><strong>Course:</strong> ${lead.course || 'N/A'}</div>
        <div><strong>Profession:</strong> ${lead.profession || 'N/A'}</div>
        <div><strong>Source:</strong> ${lead.source || 'Other'}</div>
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
  document.getElementById('modal-lead-university').value = lead.university || '';
  document.getElementById('modal-lead-course').value = lead.course || '';
  document.getElementById('modal-lead-profession').textContent = lead.profession || 'N/A';
  document.getElementById('modal-lead-source').textContent = lead.source || 'Other';
  
  // Set status dropdown to empty (keep current)
  document.getElementById('modal-lead-status').value = '';
  
  // Clear quick update fields
  document.getElementById('quick-update-note').value = '';

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
        <div style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
          <div 
            onclick="toggleBrochureSection()" 
            style="padding:12px 14px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); transition:all 0.2s ease; user-select:none;"
            onmouseover="this.style.background='linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)'"
            onmouseout="this.style.background='linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'">
            <h4 style="margin:0; color:#1e293b; font-size:14px; display:flex; align-items:center; gap:8px; font-weight:600;">
              <i class="fas fa-book-open" style="color:#6366f1;"></i>
              Available Brochures for Download
              <span style="background:#6366f1; color:white; font-size:11px; padding:2px 6px; border-radius:10px; font-weight:600;">${allBrochures.length}</span>
            </h4>
            <i id="brochure-toggle-icon" class="fas fa-chevron-down" style="color:#6366f1; font-size:14px; transition:transform 0.3s ease;"></i>
          </div>
          
          <div id="brochure-collapse-content" style="max-height:0; overflow:hidden; transition:max-height 0.4s ease, padding 0.4s ease; padding:0 12px;">
            <div style="padding-bottom:12px;">
              <div style="margin-bottom:8px; margin-top:12px;">
                <input 
                  type="text" 
                  id="modal-brochure-search" 
                  placeholder="🔍 Search university or course..." 
                  oninput="filterModalBrochures()"
                  style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; background:white;">
              </div>
              
              <div style="margin-bottom:12px; display:flex; gap:8px;">
                <select id="modal-brochure-filter-univ" onchange="filterModalBrochures()" size="1" style="flex:1; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; background:white; cursor:pointer;">
                  <option value="">All Universities</option>
                </select>
                <select id="modal-brochure-filter-course" onchange="filterModalBrochures()" size="1" style="flex:1; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; background:white; cursor:pointer;">
                  <option value="">All Courses</option>
                </select>
              </div>
              
              <div id="modal-brochure-list" style="max-height:300px; overflow-y:auto; background:white; border:1px solid #e2e8f0; border-radius:6px; padding:8px;">
                <!-- Brochures will be populated here -->
              </div>
            </div>
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

  displayTimeline(lead);
  
  // Display next call date if exists
  displayFollowUpSchedule(lead.nextCallDateTime);
  
  const leadModal = document.getElementById('lead-modal');
  leadModal.style.display = 'flex';
  // Trigger slide-in animation on next frame
  requestAnimationFrame(() => {
    leadModal.classList.add('open');
  });
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
  const leadModal = document.getElementById('lead-modal');
  if (!leadModal) return;
  // Start slide-out
  leadModal.classList.remove('open');
  // After transition, hide and reset fields
  const HIDE_DELAY = 300;
  setTimeout(() => {
    leadModal.style.display = 'none';
    const noteEl = document.getElementById('quick-update-note');
    const statusEl = document.getElementById('modal-lead-status');
    if (noteEl) noteEl.value = '';
    if (statusEl) statusEl.value = '';
    currentLead = null;
  }, HIDE_DELAY);
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

// Date matching helper function
function checkDateMatch(date, filterType, customDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  switch (filterType) {
    case 'today':
      return compareDate.getTime() === today.getTime();
    
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return compareDate.getTime() === yesterday.getTime();
    
    case 'thisweek':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return compareDate >= weekStart && compareDate <= today;
    
    case 'lastweek':
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      return compareDate >= lastWeekStart && compareDate <= lastWeekEnd;
    
    case 'thismonth':
      return compareDate.getMonth() === today.getMonth() && 
             compareDate.getFullYear() === today.getFullYear();
    
    case 'custom':
      if (!customDate) return true;
      const customCompare = new Date(customDate);
      customCompare.setHours(0, 0, 0, 0);
      return compareDate.getTime() === customCompare.getTime();
    
    default:
      return true;
  }
}

// Clear filters function
function clearFilters() {
  window.currentLeadsPage = 1; // Reset pagination
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-source').value = '';
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-date').value = '';
  document.getElementById('filter-custom-date').style.display = 'none';
  document.getElementById('filter-custom-date').value = '';
  clearUserNoActionFilter(false);
  displayLeads();
}

// Display unified timeline combining status changes and notes
function displayTimeline(lead) {
  const container = document.getElementById('timeline-container');
  container.innerHTML = '';
  
  const timeline = [];
  
  // Add status history
  if (lead.statusHistory && lead.statusHistory.length > 0) {
    lead.statusHistory.forEach(entry => {
      timeline.push({
        type: 'status',
        content: entry.status,
        date: new Date(entry.changedAt),
        dateStr: entry.changedAt
      });
    });
  }
  
  // Add notes
  if (lead.notes && lead.notes.length > 0) {
    lead.notes.forEach(note => {
      timeline.push({
        type: 'note',
        content: note.content,
        date: new Date(note.createdAt),
        dateStr: note.createdAt
      });
    });
  }
  
  if (timeline.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No activity yet</p>';
    return;
  }
  
  // Sort by date (newest first)
  timeline.sort((a, b) => b.date - a.date);
  
  timeline.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'note-item';
    
    if (entry.type === 'status') {
      item.innerHTML = `
        <div class="note-content" style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-exchange-alt" style="color: #6366f1;"></i>
          <strong>Status changed to:</strong> 
          <span class="lead-status status-${(entry.content||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}">${entry.content}</span>
        </div>
        <div class="note-date">${entry.date.toLocaleString()}</div>
      `;
    } else {
      item.innerHTML = `
        <div class="note-content" style="display: flex; gap: 8px;">
          <i class="fas fa-comment-dots" style="color: #10b981; margin-top: 2px;"></i>
          <span>${entry.content}</span>
        </div>
        <div class="note-date">${entry.date.toLocaleString()}</div>
      `;
    }
    
    container.appendChild(item);
  });
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

async function quickUpdateLead() {
  if (!currentLead) return;
  
  const newStatus = document.getElementById('modal-lead-status').value;
  const noteContent = document.getElementById('quick-update-note').value.trim();
  const dateTimeValue = document.getElementById('modal-followup-datetime').value;
  
  // Validate that at least one field is being updated
  if (!newStatus && !noteContent && !dateTimeValue) {
    showToast('No Changes', 'Please update at least one field (status, note, or schedule)', 'warning');
    return;
  }
  
  // Validate future date if provided
  if (dateTimeValue) {
    const followUpDate = new Date(dateTimeValue);
    const now = new Date();
    if (followUpDate <= now) {
      showToast('Invalid Date', 'Follow-up time must be in the future', 'warning');
      return;
    }
  }
  
  try {
    showLoading('Updating Lead...', 'Please wait');
    
    const updateData = {};
    if (newStatus) updateData.status = newStatus;
    if (noteContent) updateData.note = noteContent;
    if (dateTimeValue) {
      updateData.nextCallDateTime = new Date(dateTimeValue).toISOString();
    }
    
    const response = await apiCall(`/leads/${currentLead._id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update local data
      const index = allLeads.findIndex(l => l._id === currentLead._id);
      if (index !== -1) {
        allLeads[index] = data;
      }
      
      currentLead = data;
      
      // Update display
      updateStats();
      displayLeads();
      displayTimeline(data);
      displayFollowUpSchedule(data.nextCallDateTime);
      
      // Clear form fields
      document.getElementById('modal-lead-status').value = '';
      document.getElementById('quick-update-note').value = '';
      
      hideLoading();
      
      const updates = [];
      if (newStatus) updates.push('status');
      if (noteContent) updates.push('note');
      if (dateTimeValue) updates.push('schedule');
      
      showToast('Success', `Lead updated successfully! (${updates.join(', ')})`, 'success');
      // Close the modal after successful update
      closeModal();
      
      // Start checking for this reminder if scheduled
      if (dateTimeValue) {
        checkReminders();
      }
    } else {
      hideLoading();
      showToast('Error', data.message || 'Failed to update lead', 'error');
    }
  } catch (error) {
    hideLoading();
    console.error('Error updating lead:', error);
    showToast('Error', 'Failed to update lead', 'error');
  }
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

// Copy lead details to clipboard
function copyLeadDetails() {
  if (!currentLead) return;
  
  const details = `Name: ${currentLead.name || ''}
Contact: ${currentLead.contact || ''}
Email: ${currentLead.email || ''}
University: ${currentLead.university || ''}
Course: ${currentLead.course || ''}`;
  
  navigator.clipboard.writeText(details).then(() => {
    showToast('Copied!', 'Lead details copied to clipboard', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Error', 'Failed to copy to clipboard', 'error');
  });
}

// Update lead field (university or course)
async function updateLeadField(field) {
  if (!currentLead) return;
  
  const value = document.getElementById(`modal-lead-${field}`).value.trim();
  
  if (!value) {
    showToast('Error', `Please enter a ${field}`, 'error');
    return;
  }
  
  try {
    showLoading('Updating...', 'Please wait');
    
    const updateData = {};
    updateData[field] = value;
    
    const response = await apiCall(`/leads/${currentLead._id}/field`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
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
      
      hideLoading();
      showToast('Success', `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`, 'success');
    } else {
      hideLoading();
      showToast('Error', data.message || 'Failed to update', 'error');
    }
  } catch (error) {
    hideLoading();
    console.error('Error updating field:', error);
    showToast('Error', 'Failed to update', 'error');
  }
}

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

// Event listeners for filters
document.getElementById('filter-status').addEventListener('change', () => {
  window.currentLeadsPage = 1; // Reset pagination on filter change
  displayLeads();
});

document.getElementById('filter-source').addEventListener('change', () => {
  window.currentLeadsPage = 1;
  displayLeads();
});

// Date filter event listener
document.getElementById('filter-date').addEventListener('change', (e) => {
  const customDateInput = document.getElementById('filter-custom-date');
  if (e.target.value === 'custom') {
    customDateInput.style.display = 'block';
  } else {
    customDateInput.style.display = 'none';
    customDateInput.value = '';
  }
  window.currentLeadsPage = 1;
  displayLeads();
});

// Custom date input event listener
document.getElementById('filter-custom-date').addEventListener('change', () => {
  window.currentLeadsPage = 1;
  displayLeads();
});

// User no action filter controls
function toggleUserNoActionFilter() {
  const panel = document.getElementById('user-no-action-filter-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function clearUserNoActionFilter(shouldHidePanel = true) {
  const period = document.getElementById('user-no-action-period');
  const start = document.getElementById('user-no-action-start-date');
  const end = document.getElementById('user-no-action-end-date');
  const customDates = document.getElementById('user-no-action-custom-dates');
  const status = document.getElementById('user-no-action-filter-status');
  if (period) period.value = '7';
  if (start) start.value = '';
  if (end) end.value = '';
  if (customDates) customDates.style.display = 'none';
  if (status) status.innerHTML = '<i class="fas fa-info-circle"></i> Shows leads assigned to you with no status change or note in the selected period.';
  userNoActionFilterActive = false;
  userNoActionFilterConfig = { days: 7, startDate: null, endDate: null };
  if (shouldHidePanel) {
    const panel = document.getElementById('user-no-action-filter-panel');
    if (panel) panel.style.display = 'none';
  }
}

function applyUserNoActionFilter() {
  const period = document.getElementById('user-no-action-period').value;
  const status = document.getElementById('user-no-action-filter-status');
  if (period === 'custom') {
    const start = document.getElementById('user-no-action-start-date').value;
    const end = document.getElementById('user-no-action-end-date').value;
    if (!start || !end) {
      showToast('Date Required', 'Select both start and end dates', 'warning');
      return;
    }
    if (new Date(start) > new Date(end)) {
      showToast('Invalid Date Range', 'Start date must be before end date', 'warning');
      return;
    }
    userNoActionFilterConfig = { days: null, startDate: start, endDate: end };
  } else {
    userNoActionFilterConfig = { days: parseInt(period, 10), startDate: null, endDate: null };
  }

  userNoActionFilterActive = true;
  if (status) {
    if (userNoActionFilterConfig.days) {
      const labels = {
        1: 'last 24 hours',
        3: 'last 3 days',
        7: 'last 7 days',
        15: 'last 15 days',
        30: 'last 30 days'
      };
      status.innerHTML = `<i class="fas fa-check-circle"></i> Showing leads with no activity in the ${labels[userNoActionFilterConfig.days] || userNoActionFilterConfig.days + ' days'}`;
    } else {
      status.innerHTML = `<i class="fas fa-check-circle"></i> Showing leads with no activity from ${userNoActionFilterConfig.startDate} to ${userNoActionFilterConfig.endDate}`;
    }
  }
  displayLeads();
}

function checkUserLeadNoAction(lead, config) {
  if (!lead) return false;
  const now = new Date();
  let startDate;
  let endDate;
  if (config.days) {
    endDate = now;
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - config.days);
  } else {
    startDate = new Date(config.startDate);
    endDate = new Date(config.endDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const leadCreated = new Date(lead.createdAt);
  if (leadCreated > endDate) return false;
  const effectiveStart = leadCreated > startDate ? leadCreated : startDate;

  if (lead.statusHistory && lead.statusHistory.length > 0) {
    for (let i = 1; i < lead.statusHistory.length; i++) {
      const changeDate = new Date(lead.statusHistory[i].changedAt);
      if (changeDate >= effectiveStart && changeDate <= endDate) {
        return false;
      }
    }
  }

  if (lead.notes && lead.notes.length > 0) {
    for (const note of lead.notes) {
      const noteDate = new Date(note.createdAt);
      if (noteDate >= effectiveStart && noteDate <= endDate) {
        return false;
      }
    }
  }
  return true;
}

// Debounced search to avoid excessive re-renders
document.getElementById('filter-search').addEventListener('input', debounce(() => {
  window.currentLeadsPage = 1; // Reset pagination on search
  displayLeads();
}, 300)); // Wait 300ms after user stops typing

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

// Load shown reminders from localStorage on page load
function loadShownReminders() {
  try {
    const stored = localStorage.getItem('shownReminders');
    if (stored) {
      const data = JSON.parse(stored);
      // Only keep reminders from last 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      shownReminders = new Set(
        data.filter(item => {
          const timestamp = parseInt(item.split('|')[1]);
          return timestamp > oneDayAgo;
        })
      );
    }
  } catch (error) {
    console.error('Error loading shown reminders:', error);
    shownReminders = new Set();
  }
}

// Save shown reminders to localStorage
function saveShownReminders() {
  try {
    localStorage.setItem('shownReminders', JSON.stringify(Array.from(shownReminders)));
  } catch (error) {
    console.error('Error saving shown reminders:', error);
  }
}

function startReminderSystem() {
  // Load previously shown reminders
  loadShownReminders();
  
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
    const leadKey = lead._id + '-' + lead.nextCallDateTime + '|' + Date.now();
    const baseKey = lead._id + '-' + lead.nextCallDateTime;
    
    // Check if snoozed
    const snoozeTime = snoozedReminders.get(lead._id);
    if (snoozeTime && now < snoozeTime) {
      return; // Still snoozed
    }
    
    // Check if already shown (look for any key starting with baseKey)
    const alreadyShown = Array.from(shownReminders).some(key => key.startsWith(baseKey));
    
    // Add to active reminders if within 5 minutes of follow-up time
    if (timeDiff > 0 && timeDiff <= 300000) {
      activeReminders.push({
        lead: lead,
        isOverdue: false,
        time: followUpTime
      });
      
      // Show popup for first-time reminder
      if (!alreadyShown) {
        showReminderPopup(lead);
        shownReminders.add(leadKey);
        saveShownReminders();
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
      if (!alreadyShown) {
        showReminderPopup(lead, true);
        shownReminders.add(leadKey);
        saveShownReminders();
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
  
  // Save lead reference before closing popup (which clears currentReminderLead)
  const leadId = currentReminderLead._id;
  
  closeReminderPopup();
  
  // Fetch fresh lead data to ensure we have the latest
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
    showToast('Error', 'Failed to load lead details', 'error');
  });
}

function snoozeReminder() {
  if (!currentReminderLead) return;
  
  // Snooze for 15 minutes
  const snoozeUntil = new Date(Date.now() + 15 * 60 * 1000);
  snoozedReminders.set(currentReminderLead._id, snoozeUntil);
  
  // Remove from shown reminders so it can appear again after snooze
  const baseKey = currentReminderLead._id + '-' + currentReminderLead.nextCallDateTime;
  // Remove all keys that start with baseKey
  Array.from(shownReminders).forEach(key => {
    if (key.startsWith(baseKey)) {
      shownReminders.delete(key);
    }
  });
  saveShownReminders();
  
  closeReminderPopup();
  showToast('Snoozed', 'Reminder snoozed for 15 minutes', 'info');
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
    badge.style.display = 'flex';
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

// Reminder system now starts automatically after leads are loaded in loadLeads()

// Stop reminder system when page unloads
window.addEventListener('beforeunload', () => {
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval);
  }
  // Stop update polling
  stopUpdatePolling();
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
  
  Object.keys(grouped).sort().forEach((univ, univIndex) => {
    const univSection = document.createElement('div');
    univSection.style.cssText = 'margin-bottom:8px; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden;';
    
    const univHeader = document.createElement('div');
    univHeader.style.cssText = 'font-weight:600; color:#1e293b; font-size:13px; padding:10px 12px; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); cursor:pointer; display:flex; justify-content:space-between; align-items:center; user-select:none; transition:all 0.2s ease;';
    univHeader.onclick = () => toggleUniversitySection(univIndex);
    univHeader.onmouseenter = (e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)'; };
    univHeader.onmouseleave = (e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'; };
    
    const courseCount = grouped[univ].length;
    univHeader.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <i class="fas fa-university" style="color:#6366f1; font-size:11px;"></i>
        ${univ}
        <span style="background:#6366f1; color:white; font-size:10px; padding:2px 6px; border-radius:10px; font-weight:600;">${courseCount}</span>
      </div>
      <i id="univ-toggle-${univIndex}" class="fas fa-chevron-down" style="color:#6366f1; font-size:12px; transition:transform 0.3s ease;"></i>
    `;
    univSection.appendChild(univHeader);
    
    const coursesContainer = document.createElement('div');
    coursesContainer.id = `univ-courses-${univIndex}`;
    coursesContainer.style.cssText = 'max-height:0; overflow:hidden; transition:max-height 0.4s ease, padding 0.4s ease; background:#ffffff;';
    
    const coursesInner = document.createElement('div');
    coursesInner.style.cssText = 'padding:8px;';
    
    grouped[univ].forEach(brochure => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px; border:1px solid #e2e8f0; border-radius:4px; margin-bottom:6px; background:#fafafa; transition:all 0.2s;';
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
      
      coursesInner.appendChild(item);
    });
    
    coursesContainer.appendChild(coursesInner);
    univSection.appendChild(coursesContainer);
    listDiv.appendChild(univSection);
  });
}

// Toggle university section in brochures
function toggleUniversitySection(univIndex) {
  const content = document.getElementById(`univ-courses-${univIndex}`);
  const icon = document.getElementById(`univ-toggle-${univIndex}`);
  
  if (!content || !icon) return;
  
  const isCollapsed = content.style.maxHeight === '0px' || content.style.maxHeight === '';
  
  if (isCollapsed) {
    // Expand - calculate actual content height
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.style.transform = 'rotate(180deg)';
  } else {
    // Collapse
    content.style.maxHeight = '0';
    icon.style.transform = 'rotate(0deg)';
  }
}

// Function to filter brochures in modal
function filterModalBrochures() {
  if (!window.modalBrochures) return;
  
  const searchInput = document.getElementById('modal-brochure-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const univFilter = document.getElementById('modal-brochure-filter-univ').value;
  const courseFilter = document.getElementById('modal-brochure-filter-course').value;
  
  let filtered = window.modalBrochures;
  
  // Apply search filter first
  if (searchTerm) {
    filtered = filtered.filter(b => 
      (b.university || '').toLowerCase().includes(searchTerm) || 
      (b.course || '').toLowerCase().includes(searchTerm)
    );
  }
  
  if (univFilter) {
    filtered = filtered.filter(b => b.university === univFilter);
  }
  
  if (courseFilter) {
    filtered = filtered.filter(b => b.course === courseFilter);
  }
  
  displayModalBrochures(filtered);
}

// Toggle brochure section collapse
function toggleBrochureSection() {
  const content = document.getElementById('brochure-collapse-content');
  const icon = document.getElementById('brochure-toggle-icon');
  
  if (!content || !icon) return;
  
  const isCollapsed = content.style.maxHeight === '0px' || content.style.maxHeight === '';
  
  if (isCollapsed) {
    // Expand
    content.style.maxHeight = '450px';
    content.style.paddingTop = '0';
    content.style.paddingBottom = '0';
    icon.style.transform = 'rotate(180deg)';
  } else {
    // Collapse
    content.style.maxHeight = '0';
    content.style.paddingTop = '0';
    content.style.paddingBottom = '0';
    icon.style.transform = 'rotate(0deg)';
  }
}

// Copy to clipboard functionality
function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showCopyToast(`${label} copied!`);
  }).catch(err => {
    console.error('Failed to copy:', err);
    showCopyToast('Failed to copy', 'error');
  });
}

// Copy all lead details
function copyAllLeadDetails(lead) {
  const details = `Name: ${lead.name}
Contact: ${lead.contact || 'N/A'}
Email: ${lead.email || 'N/A'}
City: ${lead.city || 'N/A'}
University: ${lead.university || 'N/A'}
Course: ${lead.course || 'N/A'}
Profession: ${lead.profession || 'N/A'}
Source: ${lead.source || 'Other'}
Status: ${lead.status || 'N/A'}`;
  
  navigator.clipboard.writeText(details).then(() => {
    showCopyToast('All details copied!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showCopyToast('Failed to copy', 'error');
  });
}

// Simple toast for copy notifications
function showCopyToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideInRight 0.3s ease;
  `;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>${message}`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
