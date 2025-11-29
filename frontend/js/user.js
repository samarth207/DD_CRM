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
  
  // Create status chart
  const ctx = document.getElementById('user-status-chart');
  if (ctx) {
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

function openLeadModal(lead) {
  currentLead = lead;
  
  document.getElementById('modal-lead-name').textContent = lead.name;
  document.getElementById('modal-lead-contact').textContent = lead.contact || 'N/A';
  document.getElementById('modal-lead-email').textContent = lead.email || 'N/A';
  document.getElementById('modal-lead-city').textContent = lead.city || 'N/A';
  document.getElementById('modal-lead-university').textContent = lead.university || 'N/A';
  document.getElementById('modal-lead-course').textContent = lead.course || 'N/A';
  document.getElementById('modal-lead-profession').textContent = lead.profession || 'N/A';
  document.getElementById('modal-lead-status').value = lead.status;
  
  displayStatusHistory(lead.statusHistory || []);
  displayNotes(lead.notes);
  
  document.getElementById('lead-modal').style.display = 'flex';
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
