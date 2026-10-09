"""Render cheatsheet.html -> ../assets/ros2-cheatsheet.pdf (A4 landscape, 2 pages) and the
two JPG previews the landing page shows (../assets/cheatsheet-p1.jpg, -p2.jpg).

usage: python3 cheatsheet/build_sheet.py [--check]
  --check only writes preview-p1.png / preview-p2.png next to this script, for a quick look.
Needs: pip install playwright pillow && playwright install chromium
"""
import os, sys, subprocess
from playwright.sync_api import sync_playwright
# (the container this was first built in keeps its browsers here; harmless elsewhere)
if os.path.isdir('/opt/pw-browsers'):   # where the machine this was first built on keeps its browsers
    os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers') if os.path.isdir('/opt/pw-browsers') else None
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
html = os.path.join(HERE, 'cheatsheet.html')
pdf = os.path.join(SITE, 'assets', 'ros2-cheatsheet.pdf')
check = '--check' in sys.argv
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1123, 'height': 794}, device_scale_factor=2)
    pg.goto('file://' + html)
    pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(400)
    pg.emulate_media(media='print')
    # overflow check: does any page's content spill past its box?
    info = pg.evaluate('''() => [...document.querySelectorAll('.page')].map((pg,i)=>{
        const r=pg.getBoundingClientRect(); let maxBottom=0, worst='';
        pg.querySelectorAll('*').forEach(el=>{const b=el.getBoundingClientRect(); if(b.bottom>maxBottom){maxBottom=b.bottom; worst=el.className||el.tagName;}});
        return {page:i+1, height:r.height, overflow:+(maxBottom-r.bottom).toFixed(1), worst};})''')
    print('overflow (px, positive = spills):', info)
    pages = pg.locator('.page')
    for i in range(pages.count()):
        png = os.path.join(HERE, f'preview-p{i+1}.png')
        pages.nth(i).screenshot(path=png)
        if not check:   # the previews the landing page shows, 1600 px wide
            from PIL import Image
            im = Image.open(png); im = im.resize((1600, round(1600 * im.height / im.width)), Image.LANCZOS)
            im.convert('RGB').save(os.path.join(SITE, 'assets', f'cheatsheet-p{i+1}.jpg'), quality=86, optimize=True)
            os.remove(png)
    if not check:
        pg.pdf(path=pdf, format='A4', print_background=True, prefer_css_page_size=True,
               margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
    b.close()
if not check:
    print('pdf', os.path.getsize(pdf)//1024, 'KB')
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    print([l for l in out.splitlines() if l.startswith(('Pages', 'Page size'))])
