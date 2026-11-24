export interface ParsedStudentRow {
  student_id: string
  name: string
  password?: string
  phone?: string | null
}

/**
 * Robust CSV parser that handles commas inside quotes, various delimiters,
 * and intelligently maps columns regardless of column order or row index column.
 */
export function parseStudentCsv(rawText: string): { rows: ParsedStudentRow[]; parseErrors: string[] } {
  const parseErrors: string[] = []
  const rows: ParsedStudentRow[] = []

  if (!rawText || !rawText.trim()) {
    return { rows, parseErrors: ['CSV file is empty'] }
  }

  // 1. Split lines handling CRLF and LF
  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (rawLines.length === 0) {
    return { rows, parseErrors: ['No data found in CSV'] }
  }

  // 2. Parse CSV rows handling quotes
  const parsedGrid: string[][] = []
  for (const line of rawLines) {
    const row: string[] = []
    let current = ''
    let insideQuotes = false

    // Determine delimiter (comma or semicolon)
    const delimiter = line.includes(';') && !line.includes(',') ? ';' : ','

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (char === delimiter && !insideQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    row.push(current.trim())
    if (row.some((cell) => cell.length > 0)) {
      parsedGrid.push(row)
    }
  }

  if (parsedGrid.length === 0) {
    return { rows, parseErrors: ['No readable rows found in CSV'] }
  }

  // 3. Detect header row
  const headerRow = parsedGrid[0]
  let idCol = -1
  let nameCol = -1
  let pwdCol = -1
  let phoneCol = -1
  let hasHeader = false

  const idKeywords = ['student_id', 'student id', 'studentid', 'std_id', 'id_no', 'reg_no', 'roll_no', 'roll', 'admission_no', 'matric_no']
  const nameKeywords = ['student_name', 'student name', 'name', 'full_name', 'fullname', 'student']
  const phoneKeywords = ['phone', 'mobile', 'tel', 'telephone', 'contact', 'phone_number']
  const pwdKeywords = ['password', 'pass', 'pwd']

  for (let c = 0; c < headerRow.length; c++) {
    const cleanHeader = headerRow[c].toLowerCase().replace(/[^a-z0-9_ ]/g, '').trim()
    if (idKeywords.includes(cleanHeader) || cleanHeader === 'id') {
      idCol = c
      hasHeader = true
    } else if (nameKeywords.includes(cleanHeader)) {
      nameCol = c
      hasHeader = true
    } else if (phoneKeywords.includes(cleanHeader)) {
      phoneCol = c
      hasHeader = true
    } else if (pwdKeywords.includes(cleanHeader)) {
      pwdCol = c
      hasHeader = true
    }
  }

  const dataRows = hasHeader ? parsedGrid.slice(1) : parsedGrid

  // 4. Fallback column mapping if no recognized headers
  if (idCol === -1 || nameCol === -1) {
    if (dataRows.length > 0) {
      const sample = dataRows[0]

      // Check if column 0 is a row number (e.g. 1, 2, 3...)
      const col0IsRowIndex = dataRows.every((r) => {
        const val = r[0] ? r[0].replace(/[^0-9]/g, '') : ''
        return val.length > 0 && Number(val) > 0 && Number(val) < 10000 && !/[a-zA-Z]/.test(r[0] || '')
      })

      if (col0IsRowIndex && sample.length >= 3) {
        // Column 0 is row index (1, 2, 3...) -> Column 1 is ID, Column 2 is Name
        idCol = 1
        nameCol = 2
        if (sample.length >= 4) phoneCol = 3
      } else if (sample.length >= 2) {
        // Detect between column 0 and column 1: which is ID and which is Name?
        const col0 = sample[0] || ''
        const col1 = sample[1] || ''

        const col0HasSpaces = col0.includes(' ')
        const col1HasSpaces = col1.includes(' ')
        const col0HasAlnumId = /^[A-Za-z0-9_-]+$/.test(col0) && !col0HasSpaces

        if (col0HasAlnumId && col1HasSpaces) {
          idCol = 0
          nameCol = 1
        } else if (col0HasSpaces && !col1HasSpaces) {
          idCol = 1
          nameCol = 0
        } else {
          // Default: column 0 is ID, column 1 is Name
          idCol = 0
          nameCol = 1
        }
      }
    }
  }

  // Final fallback
  if (idCol === -1) idCol = 0
  if (nameCol === -1) nameCol = 1

  // 5. Extract rows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rawId = (row[idCol] || '').trim()
    const rawName = (row[nameCol] || '').trim()
    const rawPwd = pwdCol !== -1 && row[pwdCol] ? row[pwdCol].trim() : ''
    const rawPhone = phoneCol !== -1 && row[phoneCol] ? row[phoneCol].trim() : null

    if (!rawId && !rawName) {
      continue // Skip completely blank lines
    }

    if (!rawId || !rawName) {
      parseErrors.push(`Row ${i + 1}: missing required Student ID or Name`)
      continue
    }

    // Default password is ALWAYS the student's own ID
    const studentPassword = rawPwd && rawPwd.length >= 4 ? rawPwd : rawId

    rows.push({
      student_id: rawId,
      name: rawName,
      password: studentPassword,
      phone: rawPhone,
    })
  }

  return { rows, parseErrors }
}
