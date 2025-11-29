// Check authentication
const user = getUser();
if (!user || user.role !== 'user') {
  window.location.href = 'index.html';
}

document.getElementById('user-name').textContent = user.name;
if (document.getElementById('user-name-sidebar')) {
  document.getElementById('user-name-sidebar').textContent = user.name;
  // Set avatar initial
  const avatar = document.querySelector('.sidebar-user-avatar');
  if (avatar) {
    avatar.textContent = user.name.charAt(0).toUpperCase();
  }
}

let allLeads = [];
let currentLead = null;

// Load leads on page load
loadLeads();

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
    new: 0,
    hot: 0,
    closed: 0
  };
  
  allLeads.forEach(lead => {
    if (lead.status === 'New') stats.new++;
    if (lead.status === 'Hot') stats.hot++;
    if (lead.status === 'Closed Won') stats.closed++;
  });
  
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-new').textContent = stats.new;
  document.getElementById('stat-hot').textContent = stats.hot;
  document.getElementById('stat-closed').textContent = stats.closed;
}

function displayLeads() {
  const filterStatus = document.getElementById('filter-status').value;
  const filterSearch = document.getElementById('filter-search').value.toLowerCase();
  
  const filteredLeads = allLeads.filter(lead => {
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    const matchesSearch = !filterSearch || 
      lead.name.toLowerCase().includes(filterSearch) ||
      lead.email.toLowerCase().includes(filterSearch) ||
      (lead.company && lead.company.toLowerCase().includes(filterSearch));
    
    return matchesStatus && matchesSearch;
  });
  
  const container = document.getElementById('leads-container');
  container.innerHTML = '';
  
  if (filteredLeads.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No leads found</p>';
    return;
  }
  
  filteredLeads.forEach(lead => {
    const leadCard = document.createElement('div');
    leadCard.className = 'lead-card';
    leadCard.onclick = () => openLeadModal(lead);
    
    leadCard.innerHTML = `
      <div class="lead-header">
        <div class="lead-name">${lead.name}</div>
        <span class="lead-status status-${lead.status.toLowerCase().replace(' ', '-')}">${lead.status}</span>
      </div>
      <div class="lead-info">
        <div><strong>Email:</strong> ${lead.email}</div>
        <div><strong>Phone:</strong> ${lead.phone}</div>
        <div><strong>Company:</strong> ${lead.company || 'N/A'}</div>
        <div><strong>Notes:</strong> ${lead.notes.length}</div>
      </div>
    `;
    
    container.appendChild(leadCard);
  });
}

function openLeadModal(lead) {
  currentLead = lead;
  
  document.getElementById('modal-lead-name').textContent = lead.name;
  document.getElementById('modal-lead-email').textContent = lead.email;
  document.getElementById('modal-lead-phone').textContent = lead.phone;
  document.getElementById('modal-lead-company').textContent = lead.company || 'N/A';
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
      <div class="note-content"><strong>Status changed to:</strong> <span class="lead-status status-${entry.status.toLowerCase().replace(' ', '-')}">${entry.status}</span></div>
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
document.getElementById('filter-status').addEventListener('change', displayLeads);
document.getElementById('filter-search').addEventListener('input', displayLeads);

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
