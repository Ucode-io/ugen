/**
 * Exports data to JSON format (no external dependencies)
 */
export const exportToJSON = (data: any[], filename: string) => {
  const dataStr = JSON.stringify(data, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  const a = document.createElement('a')
  a.setAttribute('href', dataUri)
  a.setAttribute('download', `${filename}.json`)
  a.click()
}

/**
 * Exports data to CSV format (no external dependencies)
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '""'
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
    return `"${str.replace(/"/g, '""')}"`
  }
  const csvContent = [
    headers.map(escape).join(','),
    ...data.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exports data to XLSX-compatible format using SpreadsheetML (no external dependencies).
 * Excel, LibreOffice, and Google Sheets all open this format natively.
 */
export const exportToXLSX = (data: any[], filename: string) => {
  if (!data.length) return
  const headers = Object.keys(data[0])

  const escapeXml = (val: unknown): string => {
    const str = val === null || val === undefined
      ? ''
      : typeof val === 'object' ? JSON.stringify(val) : String(val)
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const headerRow = headers
    .map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('')

  const dataRows = data.map(row =>
    '<Row>' +
    headers.map(h => {
      const val = row[h]
      const isNumber = typeof val === 'number'
      const type = isNumber ? 'Number' : 'String'
      return `<Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`
    }).join('') +
    '</Row>'
  ).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Data">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  // Use .xls extension — SpreadsheetML is an XLS dialect Excel reads without plugins
  a.download = `${filename}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
