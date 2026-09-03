import sys, zipfile, xml.etree.ElementTree as ET, json

path = sys.argv[1]
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

def col(ref):
    return ''.join(c for c in ref if c.isalpha())

with zipfile.ZipFile(path) as z:
    strings=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        root=ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('m:si', ns):
            strings.append(''.join(t.text or '' for t in si.iterfind('.//m:t', ns)))
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    sheets=wb.find('m:sheets',ns)
    print('SHEETS')
    for ix,s in enumerate(sheets.findall('m:sheet',ns),1):
        print(ix, s.attrib.get('name'), s.attrib.get('{%s}id'%ns['r']))
    for ix,s in enumerate(sheets.findall('m:sheet',ns),1):
        name=s.attrib['name']; xml=ET.fromstring(z.read(f'xl/worksheets/sheet{ix}.xml'))
        dim=xml.find('m:dimension',ns)
        print('\n###',name,'dimension',dim.attrib.get('ref') if dim is not None else '')
        rows={}
        for cell in xml.findall('.//m:sheetData/m:row/m:c',ns):
            ref=cell.attrib['r']; typ=cell.attrib.get('t'); v=cell.find('m:v',ns); f=cell.find('m:f',ns)
            val='' if v is None else v.text
            if typ=='s' and val:
                val=strings[int(val)]
            elif typ=='inlineStr':
                t=cell.find('.//m:t',ns); val=t.text if t is not None else ''
            formula=f.text if f is not None else None
            if val or formula:
                rows.setdefault(int(''.join(c for c in ref if c.isdigit())),[]).append((ref,val,formula,cell.attrib.get('s')))
        for r,cells in rows.items():
            # only populated rows; avoid silent rows of formula-free blanks
            print('ROW',r, ' | '.join(f'{a}={b!r}'+(f' [={c}]' if c else '')+ (f' {{style {d}}}' if d else '') for a,b,c,d in cells))
