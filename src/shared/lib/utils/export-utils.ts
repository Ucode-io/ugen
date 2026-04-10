import * as XLSX from 'xlsx'

/**
 * Exports data to JSON format
 */
export const exportToJSON = (data: any[], filename: string) => {
  const dataStr = JSON.stringify(data, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', `${filename}.json`)
  linkElement.click()
}

/**
 * Exports data to CSV format
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row: any) => headers.map(fieldName => {
      let val = row[fieldName];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\r\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Exports data to XLSX format
 */
export const exportToXLSX = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
