import json, urllib.request, os, sys
TOK = os.environ.get('GH_TOKEN', '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')
def get(u):
    h={'Accept':'application/vnd.github+json','User-Agent':'stride-agent','Authorization':'Bearer '+TOK}
    try:
        return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=40))
    except Exception as e:
        return {'error': str(e)}
if __name__ == '__main__':
    r = get('https://api.github.com/repos/Ambitious513/2d-character')
    print('repo:', r.get('full_name'), '| private:', r.get('private'), '| perms:', r.get('permissions'), '| err:', r.get('error'))
    c = get('https://api.github.com/repos/Ambitious513/2d-character/commits/main')
    print('main sha:', c.get('sha'))
    print('msg:', (c.get('commit',{}).get('message') or '').splitlines()[:2])
    print('date:', c.get('commit',{}).get('committer',{}).get('date'))
