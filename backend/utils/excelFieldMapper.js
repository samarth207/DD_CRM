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

  // Extract fields with smart mapping and defaults
  const name = extractField(row, 'name', 'Unknown');
  const contact = extractField(row, 'contact', '');
  const email = extractField(row, 'email', '');
  const city = extractField(row, 'city', 'N/A');
  const university = extractField(row, 'university', 'N/A');
  const course = extractField(row, 'course', 'N/A');
  const profession = extractField(row, 'profession', 'N/A');
  const status = extractField(row, 'status', defaultStatus);
  const notesContent = extractField(row, 'notes', '');

  // Build lead object
  const leadData = {
    name,
    contact,
    email,
    city,
    university,
    course,
    profession,
    status,
    assignedTo: assignedUserId,
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
