/**
 * Smart Excel Field Mapper
 * Handles flexible column names, ordering, and missing fields
 */

// Field mapping definitions - add variations of column names
const FIELD_MAPPINGS = {
  name: ['name', 'full name', 'fullname', 'student name', 'lead name', 'candidate name', 'person name'],
  contact: ['contact', 'phone', 'mobile', 'phone number', 'contact number', 'mobile number', 'cell', 'telephone'],
  email: ['email', 'e-mail', 'mail', 'email address', 'e-mail address'],
  city: ['city', 'location', 'place', 'town'],
  university: ['university', 'univ', 'college', 'institution', 'school'],
  course: ['course', 'program', 'degree', 'program name', 'course name'],
  profession: ['profession', 'profassion', 'occupation', 'job', 'work', 'career', 'current profession'],
  source: ['source', 'lead source', 'source of lead', 'origin', 'channel', 'marketing source', 'campaign'],
  status: ['status', 'lead status', 'current status', 'stage'],
  notes: ['notes', 'note', 'comments', 'comment', 'remarks', 'remark', 'description']
};

/**
 * Normalize column name for matching
 * @param {string} colName - Raw column name from Excel
 * @returns {string} - Normalized column name
 */
function normalizeColumnName(colName) {
  if (!colName) return '';
  return colName.toString().trim().toLowerCase();
}

/**
 * Find the CRM field name for a given Excel column
 * @param {string} excelColumn - Column name from Excel
 * @returns {string|null} - Mapped CRM field name or null
 */
function findFieldMapping(excelColumn) {
  const normalized = normalizeColumnName(excelColumn);
  
  for (const [fieldName, variations] of Object.entries(FIELD_MAPPINGS)) {
    if (variations.includes(normalized)) {
      return fieldName;
    }
  }
  
  return null;
}

/**
 * Extract field value from row based on flexible column matching
 * @param {Object} row - Excel row object
 * @param {string} fieldName - CRM field name (name, email, etc.)
 * @param {string} defaultValue - Default value if field is missing or empty
 * @returns {string} - Extracted and sanitized value
 */
function extractField(row, fieldName, defaultValue = '') {
  const variations = FIELD_MAPPINGS[fieldName] || [];
  
  // Try to find a matching column in the row
  for (const key of Object.keys(row)) {
    const normalized = normalizeColumnName(key);
    if (variations.includes(normalized)) {
      const value = row[key];
      // Check if value is empty, null, undefined, or whitespace
      if (value === null || value === undefined || String(value).trim() === '') {
        return defaultValue;
      }
      
      // Special handling for contact/phone numbers to handle scientific notation
      if (fieldName === 'contact') {
        // Convert to string and handle scientific notation
        let contactStr = String(value).trim();
        
        // If it's in scientific notation (e.g., 9.17046E+11), convert it properly
        if (contactStr.includes('E+') || contactStr.includes('e+')) {
          try {
            // Parse as number and format without decimals
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              contactStr = numValue.toFixed(0); // Remove decimals
            }
          } catch (e) {
            console.warn('Failed to parse contact number:', value);
          }
        }
        
        // Remove all non-digit characters (including apostrophes)
        contactStr = contactStr.replace(/\D/g, '');
        
        return contactStr || defaultValue;
      }
      
      // Special handling for status to normalize case variations
      if (fieldName === 'status') {
        const statusStr = String(value).trim();
        // Map common variations to correct enum values
        const statusMap = {
          'did not pick': 'Did not pick',
          'didnotpick': 'Did not pick',
          'buffer fresh': 'Buffer fresh',
          'bufferfresh': 'Buffer fresh',
          'request call back': 'Request call back',
          'requestcallback': 'Request call back',
          'follow up': 'Follow up',
          'followup': 'Follow up',
          'interested in next batch': 'Interested in next batch',
          'registration fees paid': 'Registration fees paid',
          'junk/not interested': 'Junk/not interested',
          'junk': 'Junk/not interested',
          'not interested': 'Junk/not interested',
          'fresh': 'Fresh',
          'counselled': 'Counselled',
          'enrolled': 'Enrolled'
        };
        
        const normalized = statusStr.toLowerCase();
        return statusMap[normalized] || statusStr;
      }
      
      return String(value).trim();
    }
  }
  
  return defaultValue;
}

/**
 * Map Excel row to Lead object with smart field detection
 * @param {Object} row - Excel row data
 * @param {Object} options - Additional options (assignedUserId, createdBy, etc.)
 * @returns {Object} - Mapped lead data ready for database insertion
 */
function mapExcelRowToLead(row, options = {}) {
  const {
    assignedUserId,
    createdBy,
    defaultStatus = 'Fresh'
  } = options;

  // Extract fields with smart mapping
  const name = extractField(row, 'name', '');
  const contact = extractField(row, 'contact', '');
  const email = extractField(row, 'email', '');
  const city = extractField(row, 'city', '');
  const university = extractField(row, 'university', '');
  const course = extractField(row, 'course', '');
  const profession = extractField(row, 'profession', '');
  const status = extractField(row, 'status', defaultStatus);
  const notesContent = extractField(row, 'notes', '');

  // Normalize contact (remove non-digits)
  const normContact = contact ? String(contact).replace(/\D/g, '') : '';
  
  // Normalize email
  const normEmail = email ? email.trim().toLowerCase() : '';
  
  // Helper to check if value is meaningful (not empty, not just underscore/dash)
  const isMeaningful = (val) => {
    if (!val) return false;
    const trimmed = String(val).trim();
    return trimmed && trimmed !== '_' && trimmed !== '-' && trimmed !== 'N/A' && trimmed !== 'n/a';
  };

  // Build lead object - only include fields with meaningful values (matching manual form behavior)
  const leadData = {
    name: name || 'Unknown',
    contact: normContact,
    email: normEmail || undefined,
    city: isMeaningful(city) ? city.trim() : undefined,
    university: isMeaningful(university) ? university.trim() : undefined,
    course: isMeaningful(course) ? course.trim() : undefined,
    profession: isMeaningful(profession) ? profession.trim() : undefined,
    status: status,
    assignedTo: assignedUserId,
    createdBy: createdBy,
    notes: notesContent ? [{
      content: notesContent,
      createdBy: createdBy
    }] : [],
    statusHistory: [{
      status: status,
      changedBy: createdBy,
      changedAt: new Date()
    }],
    assignmentHistory: [{
      action: 'assigned',
      fromUser: null,
      toUser: assignedUserId,
      changedBy: createdBy,
      changedAt: new Date()
    }]
  };

  return leadData;
}

/**
 * Get mapping summary for uploaded Excel columns
 * @param {Array} excelData - Array of Excel rows
 * @returns {Object} - Mapping summary showing which columns were detected
 */
function getMappingSummary(excelData) {
  if (!excelData || excelData.length === 0) {
    return { detected: {}, unrecognized: [], totalColumns: 0 };
  }

  const firstRow = excelData[0];
  const detected = {};
  const unrecognized = [];

  for (const column of Object.keys(firstRow)) {
    const fieldName = findFieldMapping(column);
    if (fieldName) {
      detected[column] = fieldName;
    } else {
      unrecognized.push(column);
    }
  }

  return {
    detected,
    unrecognized,
    totalColumns: Object.keys(firstRow).length
  };
}

module.exports = {
  mapExcelRowToLead,
  extractField,
  findFieldMapping,
  getMappingSummary,
  normalizeColumnName
};
