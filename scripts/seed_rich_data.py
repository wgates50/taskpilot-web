import requests
import json

API = 'https://taskpilot-web.vercel.app/api/messages'
HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ICm1FWLoqKZVjIwdY0lSdIHDahXvWIIPOFKybwnkzJA'
}

def post(task_id, blocks, ts=None):
    payload = {'taskId': task_id, 'blocks': blocks}
    if ts:
        payload['timestamp'] = ts
    r = requests.post(API, json=payload, headers=HEADERS)
    print(f'{task_id}: {r.status_code}')
    if r.status_code != 201:
        print(f'  Error: {r.text[:200]}')

# ============================================================
# MORNING BRIEF — matches real Telegram output from 7 Apr run
# ============================================================
post('morning-brief', [
    {'type': 'header', 'data': {'text': 'Good morning, Will 🌤'}},
    {'type': 'weather_card', 'data': {
        'temp': 12, 'condition': 'Scattered showers, windy',
        'high': 14, 'low': 8, 'rain_chance': 65
    }},
    {'type': 'section_header', 'data': {'text': '📅 TODAY'}},
    {'type': 'text', 'data': {'text': 'One event tonight:'}},
    {'type': 'event_card', 'data': {
        'title': 'The Drama — Everyman Broadgate',
        'venue': 'Everyman Broadgate, London',
        'date': 'Tonight, 7 Apr', 'time': '8:30 PM',
        'tags': ['cinema', 'confirmed'],
        'reason': 'Seats C5 & C6 booked',
        'in_calendar': True
    }},
    {'type': 'section_header', 'data': {'text': "🎭 WHAT'S ON THIS WEEK"}},
    {'type': 'event_card', 'data': {
        'title': 'Back to the Future: The Musical — CLOSES SUNDAY',
        'venue': 'Adelphi Theatre, West End',
        'date': 'Closes Sun 12 Apr',
        'tags': ['musical', 'closing soon', 'urgent'],
        'category': 'musical',
        'reason': 'Final weekend — last chance to catch it',
        'url': 'https://www.backtothefuturemusical.com/',
        'map_url': 'https://www.google.com/maps/place/Adelphi+Theatre,+London'
    }},
    {'type': 'event_card', 'data': {
        'title': 'Belle & Sebastian',
        'venue': 'Royal Albert Hall',
        'date': 'Wed 8 Apr', 'time': '7:30 PM',
        'tags': ['music', 'gig'],
        'category': 'gig',
        'reason': 'Standout gig this week',
        'url': 'https://www.royalalberthall.com/',
        'map_url': 'https://www.google.com/maps/place/Royal+Albert+Hall,+London'
    }},
    {'type': 'event_card', 'data': {
        'title': 'Brick Lane Flea Market — New Launch',
        'venue': "Ely's Yard, Hanbury Street, E1 6QR",
        'date': 'Saturday 12 Apr',
        'tags': ['vintage', 'market', 'new'],
        'reason': 'Grand opening — curated vintage homeware, mid-century modern',
        'in_calendar': True
    }},
    {'type': 'section_header', 'data': {'text': '📌 BOOK AHEAD'}},
    {'type': 'event_card', 'data': {
        'title': 'David Bowie Immersive Experience',
        'venue': 'Lightroom, Kings Cross',
        'date': 'From Wed 16 Apr',
        'tags': ['immersive', 'new'],
        'category': 'immersive',
        'reason': 'Just went on sale — likely to sell out',
        'url': 'https://www.lightroom.uk/',
        'map_url': 'https://www.google.com/maps/place/Lightroom,+Kings+Cross,+London',
        'booking_url': 'https://www.lightroom.uk/bowie'
    }},
    {'type': 'event_card', 'data': {
        'title': 'MA/NA Japanese Restaurant',
        'venue': 'Mayfair, London',
        'date': 'Opens Sun 20 Apr',
        'tags': ['japanese', 'new opening'],
        'category': 'restaurant',
        'reason': 'New Japanese — matches your taste profile',
        'url': 'https://www.timeout.com/london/restaurants',
        'map_url': 'https://www.google.com/maps/search/MA+NA+Restaurant+Mayfair+London'
    }},
    {'type': 'section_header', 'data': {'text': '✅ ASANA'}},
    {'type': 'text', 'data': {'text': '1 overdue: CPH1 DICM (due 30 Mar). 5 tasks due Friday 10th — big deadline day.'}},
    {'type': 'section_header', 'data': {'text': '📬 EMAIL HIGHLIGHTS'}},
    {'type': 'text', 'data': {'text': 'Dune Part Three IMAX 70mm tickets now on sale. Amphora ParcelShop delivery waiting. Google Takeout export expires 13 Apr. LinkedIn message from data-centre recruiter. Pliability free trial ending tomorrow.'}},
    {'type': 'text', 'data': {'text': 'Have a good one — enjoy The Drama tonight! 🎬'}}
], ts='2026-04-07T06:00:00.000Z')


# ============================================================
# EMAIL → CALENDAR
# ============================================================
post('email-to-calendar', [
    {'type': 'header', 'data': {'text': '📧 Email scan complete'}},
    {'type': 'text', 'data': {'text': 'Scanned 10 recent emails. Found 1 calendar event and 4 informational items:'}},
    {'type': 'event_card', 'data': {
        'title': 'The Drama — Everyman Broadgate',
        'venue': 'Everyman Broadgate, London',
        'date': 'Tonight, 7 Apr', 'time': '8:30 PM',
        'tags': ['cinema', 'confirmed'],
        'reason': 'Booking confirmation — seats C5 & C6',
        'in_calendar': True
    }},
    {'type': 'section_header', 'data': {'text': '📋 OTHER EMAILS FLAGGED'}},
    {'type': 'text', 'data': {'text': '• GitHub device verification (×2) — new login from Chrome on Mac\n• PayPal: payment £27.82 to Asana, Inc\n• Amphora Wine: ParcelShop delivery ready to collect\n• Google Takeout: your export expires 13 April — download before then'}},
    {'type': 'text', 'data': {'text': 'No new events to add. Next scan: tomorrow at 5 AM.'}}
], ts='2026-04-07T05:16:00.000Z')

# ============================================================
# READING DIGEST — from 7 Apr run
# ============================================================
post('smart-reading-digest', [
    {'type': 'header', 'data': {'text': '📚 Your Daily Read — Tuesday, 7 April'}},
    {'type': 'text', 'data': {'text': '4 articles today — 2 from your regulars, 1 discovery pick, 1 deep read.'}},
    {'type': 'article_card', 'data': {
        'title': 'Amazon Deprioritizes Gulf Data Centre Regions as Iran War Deals Meaningful Damage',
        'source': 'Data Centre Dynamics',
        'category': 'Data Centres',
        'read_time': '8 min',
        'summary': 'Amazon tells employees to deprioritize Gulf regions as Iran war deals meaningful damage to AWS infrastructure in Bahrain and Dubai. Major implications for hyperscaler regional strategy.',
        'url': '#'
    }},
    {'type': 'article_card', 'data': {
        'title': 'Weekly Data Centre News — 03/04/2026',
        'source': 'Data Centre News',
        'category': 'Data Centres',
        'read_time': '6 min',
        'summary': 'Weekly roundup of data centre industry news — acquisitions, new builds, and market analysis. QTS expansion in Dallas, Vantage Frankfurt campus, and NVIDIA supply chain shifts.',
        'url': '#'
    }},
    {'type': 'article_card', 'data': {
        'title': 'Historical Walk: One Mile on the Camden Towpath',
        'source': 'Londonist',
        'category': 'Discovery',
        'read_time': '5 min',
        'summary': "Featuring Muppets, pirates, secret catacombs and snakes — a guided walk along the Camden canal towpath. Your kind of London deep cut.",
        'url': '#'
    }},
    {'type': 'article_card', 'data': {
        'title': "Senator Mark Warner on AI's Risks: \"I Want To Be More Optimistic, But I Am Terrified\"",
        'source': 'Big Technology',
        'category': 'AI & Policy',
        'read_time': '10 min',
        'summary': "The three-term senator from Virginia says nobody's ready for what AI could do to us amid rapid advances. Deep dive on regulation, existential risk, and the Senate's approach.",
        'url': '#'
    }},
    {'type': 'text', 'data': {'text': 'Happy lunching! 🌮'}}
], ts='2026-04-07T12:02:00.000Z')


# ============================================================
# ACTIVITY SUGGESTER — from 7 Apr run
# ============================================================
post('activity-suggester', [
    {'type': 'header', 'data': {'text': '💡 Activity suggestion'}},
    {'type': 'text', 'data': {'text': 'Scattered showers today, 12°C with wind — decent for a walk but keep a layer handy. Cinema at 8:30 PM so the evening is locked in.'}},
    {'type': 'event_card', 'data': {
        'title': 'Broadway Market — Tuesday stroll',
        'venue': 'Broadway Market, London Fields, E8',
        'date': 'Tomorrow, Tue 8 Apr',
        'tags': ['outdoor', 'food', 'free'],
        'reason': "Tomorrow is wide open and the market is great midweek when it's quieter"
    }},
    {'type': 'text', 'data': {'text': "Otherwise: light week ahead — good time to explore somewhere new. The Camden Towpath walk from Londonist looked interesting 👀"}},
], ts='2026-04-07T08:03:00.000Z')

# ============================================================
# FINANCE TRACKER — from 5 Apr run (latest Sunday)
# ============================================================
post('finance-tracker', [
    {'type': 'header', 'data': {'text': '💰 Weekly finance summary'}},
    {'type': 'finance_card', 'data': {
        'period': '30 MAR – 6 APR 2026',
        'totalSpend': 649.82,
        'changePct': 30.7,
        'categories': [
            {'name': 'Food & Drink', 'amount': 267.54},
            {'name': 'Shopping', 'amount': 215.59},
            {'name': 'Bills & Subs', 'amount': 156.09},
            {'name': 'Transport', 'amount': 10.60}
        ],
        'anomalies': [
            'Duck and Waffle dinner — £141.13 (single transaction)',
            'Bristol trip: The Bristol Loaf, Cabot Circus, Harvey Nichols, Lovisa',
            'SP DPUSOUTLET £95 — unusually large shopping transaction'
        ],
        'balance': 2463.73
    }},
    {'type': 'section_header', 'data': {'text': '📝 NOTABLE TRANSACTIONS'}},
    {'type': 'text', 'data': {'text': 'Duck and Waffle dinner (£141.13). Bristol trip spending (The Bristol Loaf, Cabot Circus parking, Harvey Nichols, Lovisa). Spotify renewed at £12.99. JustGiving donation to Crisis (£11.25). Vercel Pro domain charge (£9.85) — new subscription flagged.'}},
    {'type': 'section_header', 'data': {'text': '💳 SAVINGS & INVESTMENTS'}},
    {'type': 'text', 'data': {'text': 'Easy Saver: £44.40. Two JPMorgan transfers totalling £1,999.32 moved to investments this week. Savings pot balance low after the investment move.'}},
    {'type': 'section_header', 'data': {'text': '🔄 RECURRING'}},
    {'type': 'text', 'data': {'text': 'Spotify (£12.99), Pliability (£7.99 — trial ending), Vercel Pro (£9.85 — new). All direct debits paid on schedule.'}},
], ts='2026-04-06T19:02:00.000Z')


# ============================================================
# WEEKLY PLANNER — from 5 Apr run
# ============================================================
post('weekly-planner', [
    {'type': 'header', 'data': {'text': '🗓️ Week ahead: 7–13 April'}},
    {'type': 'calendar_preview', 'data': {
        'week_label': '7–13 April',
        'busyness': 'low',
        'days': [
            {'day': 'Mon', 'events': ['Book Mitsu London (reminder)'], 'free_evening': True, 'suggestion': 'The Horsemen — new pub opening at Broadgate, right by your office'},
            {'day': 'Tue', 'events': ['8:30 PM — The Drama, Everyman Broadgate'], 'free_evening': False},
            {'day': 'Wed', 'events': [], 'free_evening': True, 'suggestion': 'Belle & Sebastian at Royal Albert Hall — standout gig this week'},
            {'day': 'Thu', 'events': [], 'free_evening': True, 'suggestion': 'Bossman Mamak (new Malaysian, Soho) or Barbican Soundtrack Fest'},
            {'day': 'Fri', 'events': ['5 Asana tasks due'], 'free_evening': True, 'suggestion': 'Louie Vega at Phonox or BFI Idol Worship screening'},
            {'day': 'Sat', 'events': [], 'free_evening': True, 'suggestion': 'Flea London at Hackney Bridge — vintage and food stalls'},
            {'day': 'Sun', 'events': ['Brick Lane Flea Market (all day)'], 'free_evening': True, 'suggestion': 'Giant London Flea at Hackney Wick also on — double flea market Sunday'}
        ]
    }},
    {'type': 'section_header', 'data': {'text': '⚠️ DEADLINES & OVERDUE'}},
    {'type': 'text', 'data': {'text': '1 overdue: CPH1 DICM (due 30 Mar — 8 days late). 5 tasks due Friday 10th — biggest cluster of the week.'}},
    {'type': 'section_header', 'data': {'text': '🏛️ CLOSING SOON'}},
    {'type': 'event_card', 'data': {
        'title': 'Rose Wylie — Royal Academy',
        'venue': 'Royal Academy of Arts',
        'date': 'Closes 19 Apr',
        'tags': ['art', 'closing soon'],
        'reason': 'Last chance next weekend — worth catching before it goes'
    }},
    {'type': 'event_card', 'data': {
        'title': 'Back to the Future: The Musical',
        'venue': 'Adelphi Theatre',
        'date': 'Closes THIS SUNDAY',
        'tags': ['musical', 'closing', 'urgent'],
        'reason': 'Final performances this weekend'
    }},
    {'type': 'text', 'data': {'text': 'Very light week — just the cinema Tuesday and flea market Sunday. Plenty of free evenings to play with. 💡 Wednesday evening Event Scanner runs this week — might surface some mid-week picks worth adding.'}}
], ts='2026-04-06T14:06:00.000Z')

# ============================================================
# JOB ALERTS — from 5 Apr run
# ============================================================
post('job-alert-scanner', [
    {'type': 'header', 'data': {'text': '💼 Weekly job digest'}},
    {'type': 'section_header', 'data': {'text': '🎯 TIER 1 — DIRECT MATCHES'}},
    {'type': 'job_card', 'data': {
        'title': 'Manager, Data Center Land Development & Portfolio Management',
        'company': 'Google',
        'location': 'Austin, TX',
        'source': 'LinkedIn',
        'tags': ['data centre', 'land', 'austin'],
        'match_reason': 'Direct match — land development + portfolio mgmt for DC expansion',
        'posted': '3 Apr',
        'url': '#'
    }},
    {'type': 'job_card', 'data': {
        'title': 'Real Estate Development Manager, Data Centers',
        'company': 'Amazon AWS',
        'location': 'Austin, TX (multiple openings)',
        'source': 'LinkedIn',
        'tags': ['data centre', 'real estate', 'austin'],
        'match_reason': 'Multiple openings — AWS scaling Austin-San Antonio corridor aggressively',
        'posted': '1 Apr',
        'url': '#'
    }},
    {'type': 'job_card', 'data': {
        'title': 'Lead Strategic Negotiator, Data Centre Site Acquisitions',
        'company': 'Google',
        'location': 'London Area, UK',
        'source': 'LinkedIn',
        'tags': ['data centre', 'acquisitions', 'senior', 'london'],
        'match_reason': 'Matches your data centre acquisition interest — posted 3 Apr',
        'posted': '3 Apr',
        'url': '#'
    }},
    {'type': 'section_header', 'data': {'text': '🔶 TIER 2 — ADJACENT ROLES'}},
    {'type': 'job_card', 'data': {
        'title': 'Regional Lead, DC Site Acquisition — South Central',
        'company': 'Meta',
        'location': 'Austin, TX',
        'source': 'Indeed',
        'tags': ['data centre', 'site acquisition'],
        'match_reason': 'Site acquisition focus, Austin-based',
        'posted': '2 Apr',
        'url': '#'
    }},
    {'type': 'job_card', 'data': {
        'title': 'Director, Data Centre Engineering Design',
        'company': 'Microsoft',
        'location': 'Remote / Redmond',
        'source': 'LinkedIn',
        'tags': ['data centre', 'engineering', 'director'],
        'match_reason': 'Senior DC role — more engineering-focused but relevant experience',
        'posted': '4 Apr',
        'url': '#'
    }},
    {'type': 'section_header', 'data': {'text': '🏢 COMPANIES TO WATCH'}},
    {'type': 'text', 'data': {'text': '• Digital Realty — check internal mobility portal (your current employer)\n• Equinix — LA campus expansion hiring soon\n• CoreWeave — Austin office opening, DC buildout team forming'}},
    {'type': 'section_header', 'data': {'text': '📊 MARKET SIGNAL'}},
    {'type': 'text', 'data': {'text': 'Amazon AWS has unusually high volume of DC real estate development hiring right now. Austin-San Antonio corridor projected to double its 1.7GW data centre capacity within two years. Good time to position.'}},
    {'type': 'text', 'data': {'text': '5 Tier 1 matches, 3 Tier 2 adjacent, 3 companies to watch. Quiet week overall — market may be cooling post-Easter.'}}
], ts='2026-04-06T10:02:00.000Z')

# ============================================================
# LONDON OPENINGS — from 6 Apr / latest run
# ============================================================
post('london-openings-scanner', [
    {'type': 'header', 'data': {'text': '🌟 New London openings'}},
    {'type': 'event_card', 'data': {
        'title': 'Brick Lane Flea Market',
        'venue': "Ely's Yard, Hanbury Street, E1 6QR",
        'date': 'Launching Sat 12 Apr',
        'tags': ['market', 'vintage', 'new'],
        'reason': 'Brand new — curated vintage homeware, antique furniture, mid-century modern pieces',
        'in_calendar': True
    }},
    {'type': 'event_card', 'data': {
        'title': 'The Horsemen — New Restaurant & Pub',
        'venue': 'Broadgate, EC2',
        'date': 'Open now',
        'tags': ['pub', 'restaurant', 'new'],
        'category': 'pub',
        'reason': "Just opened at Broadgate — right by your office. Worth a first visit this week.",
        'map_url': 'https://www.google.com/maps/search/The+Horsemen+Broadgate+London'
    }},
    {'type': 'event_card', 'data': {
        'title': "Fitzgerald's at Broadgate",
        'venue': 'Broadgate Circle, EC2',
        'date': 'Open now',
        'tags': ['restaurant', 'new'],
        'category': 'restaurant',
        'reason': 'Another new Broadgate opening — American-style bistro',
        'map_url': 'https://www.google.com/maps/search/Fitzgeralds+Broadgate+London'
    }},
    {'type': 'text', 'data': {'text': '3 new openings spotted this week. Brick Lane Flea added to your What\'s On calendar. Quiet week for restaurant/café launches — post-Easter lull.'}}
], ts='2026-04-07T09:08:00.000Z')

# ============================================================
# EVENT SCANNER — from 2 Apr / latest Wednesday run
# ============================================================
post('weekly-london-event-scanner', [
    {'type': 'header', 'data': {'text': '🦊 London events — 4-week scan'}},
    {'type': 'section_header', 'data': {'text': '🔥 THIS WEEK (7–13 Apr)'}},
    {'type': 'event_card', 'data': {
        'title': 'Belle & Sebastian',
        'venue': 'Royal Albert Hall',
        'date': 'Wed 8 Apr', 'time': '7:30 PM',
        'tags': ['music', 'gig'],
        'reason': 'Indie legends at the RAH — highlight of the week'
    }},
    {'type': 'event_card', 'data': {
        'title': 'Brick Lane Flea Market — Grand Opening',
        'venue': "Ely's Yard, Hanbury Street, E1",
        'date': 'Sat 12 Apr',
        'tags': ['market', 'new', 'free entry'],
        'reason': 'New launch — vintage homeware, mid-century design goods',
        'in_calendar': True
    }},
    {'type': 'event_card', 'data': {
        'title': 'Louie Vega',
        'venue': 'Phonox, Brixton',
        'date': 'Fri 10 Apr', 'time': '10 PM',
        'tags': ['music', 'DJ', 'nightlife'],
        'category': 'nightlife',
        'reason': 'House music legend — good Friday night out option',
        'url': 'https://www.phonox.co.uk/',
        'map_url': 'https://www.google.com/maps/place/Phonox,+Brixton,+London'
    }},
    {'type': 'section_header', 'data': {'text': '📅 NEXT WEEK (14–20 Apr)'}},
    {'type': 'event_card', 'data': {
        'title': 'David Bowie Immersive Experience',
        'venue': 'Lightroom, Kings Cross',
        'date': 'From Wed 16 Apr',
        'tags': ['immersive', 'music', 'new'],
        'category': 'immersive',
        'reason': 'Just on sale — likely to sell out fast',
        'url': 'https://www.lightroom.uk/bowie',
        'map_url': 'https://www.google.com/maps/place/Lightroom,+Kings+Cross,+London'
    }},
    {'type': 'event_card', 'data': {
        'title': 'MA/NA — New Japanese Restaurant',
        'venue': 'Mayfair, London',
        'date': 'Opens Sun 20 Apr',
        'tags': ['japanese', 'restaurant', 'new opening'],
        'category': 'restaurant',
        'reason': 'High-end Japanese — strong match for your taste profile',
        'url': 'https://www.timeout.com/london/restaurants',
        'map_url': 'https://www.google.com/maps/search/MA+NA+Restaurant+Mayfair+London'
    }},
    {'type': 'section_header', 'data': {'text': '⏰ CLOSING SOON'}},
    {'type': 'event_card', 'data': {
        'title': 'Rose Wylie — Royal Academy',
        'venue': 'Royal Academy of Arts',
        'date': 'Closes 19 Apr',
        'tags': ['art', 'exhibition', 'closing'],
        'reason': 'Last two weeks — worth fitting in'
    }},
    {'type': 'event_card', 'data': {
        'title': 'Back to the Future: The Musical',
        'venue': 'Adelphi Theatre',
        'date': 'Closes Sun 12 Apr',
        'tags': ['musical', 'closing', 'urgent'],
        'reason': 'Final weekend — this is it'
    }},
    {'type': 'text', 'data': {'text': '8 events across 4 weeks. 2 added to What\'s On calendar. Next scan: Wednesday 8 April at 8 AM.'}}
], ts='2026-04-02T08:16:00.000Z')

print('\n✅ All threads populated.')
