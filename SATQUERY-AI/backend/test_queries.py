import requests, json

print('Uploading images...')
with open('c:/Users/banup/OneDrive/Desktop/SAT-QUERY/SATQUERY-AI/frontend/public/logo.png', 'rb') as f:
    res1 = requests.post('http://localhost:8000/upload', files={'file': f}).json()
with open('c:/Users/banup/OneDrive/Desktop/SAT-QUERY/SATQUERY-AI/frontend/public/logo.png', 'rb') as f:
    res2 = requests.post('http://localhost:8000/upload', files={'file': f}).json()

img_single = res1['image_id']
img_multi = [res1['image_id'], res2['image_id']]

queries = [
    ('Describe this image and is there any water body?', {'image_id': img_single}),
    ('Describe this image, is there any water body, and show me where it is.', {'image_id': img_single}),
    ('Is there a water body?', {'image_id': img_single}),
    ('Describe the image and classify the land cover.', {'image_id': img_single}),
    ('Compare these two images and show me where the changes occurred.', {'image_ids': img_multi})
]

for idx, (q, payload_base) in enumerate(queries, 1):
    payload = dict(payload_base)
    payload['query'] = q
    print(f'\n--- TEST {idx} ---')
    print('Query:', q)
    try:
        response = requests.post('http://localhost:8000/analyze', json=payload)
        print("RAW RESPONSE (status", response.status_code, "):", response.text[:200])
        outcome = response.json()
        plan_arr = outcome.get('execution_plan', [])
        print('Plan:', [f"{t.get('specialist')} (deps: {t.get('depends_on')})" for t in plan_arr])
        print('Specialist Meta:', outcome.get('specialist'))
        print('Model Meta:', outcome.get('model'))
        tr = [f"{t.get('step')}: {t.get('detail')}" for t in outcome.get('execution_trace', [])]
        print('Trace:', ' | '.join([t for t in tr if 'Agent ' in t]))
        ans = outcome.get('answer', '')
        print('Answer Preview:', ans[:200].replace('\n', ' '))
    except Exception as e:
        print('CRASH ERROR:', e)
