"""Keep original Figma main layers; the site shell is imported from the repository."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path

root = Path(__file__).resolve().parent.parent
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
ns = '{http://www.w3.org/2000/svg}'
scenes = {}
for state in ['default', 'typing', 'completed', 'error', 'submitting', 'success', 'server', 'duplicate']:
    svg = ET.parse(root / 'source' / f'figma-{state}-text.svg').getroot()
    svg.set('viewBox', '0 72 1440 1352')
    svg.set('height', '1352')
    outer = svg.find(ns + 'g')
    for child in list(outer):
        if child.get('id', '').lower() in ['body', 'navigation']:
            outer.remove(child)
    for element in svg.iter():
        if element.tag == ns + 'image':
            element.set('{http://www.w3.org/1999/xlink}href', '__BACKGROUND__')
        if element.get('id') == 'Checkbox':
            element.set('data-checkbox', '')
        if element.get('id') == 'Checkmark':
            element.set('data-checkmark', '')
        if element.tag == ns + 'text':
            spans = list(element)
            if spans and spans[0].get('y') in ['439.552', '508.974']:
                element.set('data-field', 'name' if spans[0].get('y') == '439.552' else 'email')
            if "You're in," in ''.join(element.itertext()):
                element.set('data-success-title', '')
    # Blend only the raster perimeter into the page; retain its source pixels,
    # position, dimensions, and original 0.42 layer opacity.
    defs = svg.find(ns + 'defs')
    for axis, extent, inset in [('x', 1440, 80), ('y', 810, 64)]:
        gradient = ET.SubElement(defs, ns + 'linearGradient', {
            'id': f'preview-background-{axis}',
            'x1': '0%', 'y1': '0%',
            'x2': '100%' if axis == 'x' else '0%',
            'y2': '100%' if axis == 'y' else '0%',
        })
        for offset, color in [(0, 'black'), (inset / extent, 'white'),
                              (1 - inset / extent, 'white'), (1, 'black')]:
            ET.SubElement(gradient, ns + 'stop', {
                'offset': str(offset), 'stop-color': color,
            })
    bounds = {'x': '0', 'y': '402', 'width': '1440', 'height': '810'}
    horizontal = ET.SubElement(defs, ns + 'mask', {
        **bounds, 'id': 'preview-background-sides', 'maskUnits': 'userSpaceOnUse',
        'style': 'mask-type: luminance',
    })
    ET.SubElement(horizontal, ns + 'rect', {
        **bounds, 'fill': 'url(#preview-background-x)',
    })
    perimeter = ET.SubElement(defs, ns + 'mask', {
        **bounds, 'id': 'preview-background-perimeter', 'maskUnits': 'userSpaceOnUse',
        'style': 'mask-type: luminance',
    })
    ET.SubElement(perimeter, ns + 'rect', {
        **bounds, 'fill': 'url(#preview-background-y)',
        'mask': 'url(#preview-background-sides)',
    })
    for canvas in svg.iter(ns + 'g'):
        if canvas.get('id') == 'Canvas':
            canvas.set('mask', 'url(#preview-background-perimeter)')
    scenes[state] = ET.tostring(svg, encoding='unicode')
(root / 'src' / 'scenes.json').write_text(json.dumps(scenes, ensure_ascii=False))
print({state: len(svg) for state, svg in scenes.items()})
