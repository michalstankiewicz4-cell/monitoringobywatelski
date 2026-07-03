import urllib.request
import urllib.parse
import json

def fetch_title(video_id):
    url = 'https://www.youtube.com/oembed?url=' + urllib.parse.quote_plus('https://www.youtube.com/watch?v=' + video_id) + '&format=json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.load(r)
        return data.get('title')

ids = [
    '8vpGNhuEO-g',
    'LqwMRuckhXY',
    '-f_W0VTe32E',
    'DJB2CGmAbCo',
    'hzmvLoIgbt0',
    'zc4YHxb5LV4',
    'EHo9NwLLOCE',
    'u4jt3132Tp8',
    'QBbHnRx0neA',
    'Y73tsfEhbgE',
    '6q9VhFrCq7U',
]
for vid in ids:
    try:
        print(vid, fetch_title(vid))
    except Exception as e:
        print(vid, 'ERROR', e)
