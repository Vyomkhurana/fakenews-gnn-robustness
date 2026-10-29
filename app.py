"""Live demo. Run: streamlit run app.py   (needs results/demo_cache.pt from: python src/make_demo_cache.py)
Offline: loads only the cache, no training and no internet."""
import os.path as osp
import sys

import matplotlib.pyplot as plt
import streamlit as st

sys.path.insert(0, osp.join(osp.dirname(osp.abspath(__file__)), 'src'))
from demo import BOT, NEWS, STEPS, USER, draw, load_cache, step_info  # noqa: E402

st.set_page_config(page_title='Fake news under bot attack', layout='wide')
cache = st.cache_resource(load_cache)()
stories = cache['stories']

st.title('Fake news detection under bot attack')
names = [f"Story {j + 1}: PolitiFact fake-news story #{s['graph_idx']} ({s['n'] - 1} users)" for j, s in enumerate(stories)]
s = stories[st.selectbox('Pick a story', range(len(stories)), format_func=names.__getitem__)]

if 'step' not in st.session_state:
    st.session_state.step = 0
cols = st.columns([1, 1, 1, 1, 1.1])
for j, c in enumerate(cols[:4]):
    if c.button(STEPS[j], use_container_width=True, type='primary' if st.session_state.step == j else 'secondary'):
        st.session_state.step = j
        st.rerun()
show_imp = cols[4].toggle('Show what the model looked at')
step = st.session_state.step

left, right = st.columns([3, 2], gap='large')
with left:
    fig, ax = plt.subplots(figsize=(7, 6.2))
    info = draw(ax, s, step, show_importance=show_imp)
    fig.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)
    dot = lambda c, t: f'<span style="color:{c};font-size:20px">●</span> {t}'
    legend = [dot(NEWS, 'news'), dot(USER, 'real users'), dot(BOT, 'bots (dashed = reshared from the news)')]
    if step == 2:
        legend.append('○ removed by the filter')
    if show_imp:
        legend.append('fill: darker = more important to the decision (GNNExplainer)')
    st.markdown(' &nbsp; '.join(legend), unsafe_allow_html=True)

with right:
    fake = info['label'] == 'FAKE'
    color = '#e34948' if fake else '#008300'
    pct = 100 * info['p']
    st.markdown(f"""
<div style="border:1px solid #d6d5cf;border-radius:12px;padding:22px 24px;background:#fcfcfb;color:#0b0b0b">
  <div style="font-size:13px;color:#52514e;text-transform:uppercase;letter-spacing:.06em">Model</div>
  <div style="font-size:18px;font-weight:600;margin-bottom:10px">{info['model']}</div>
  <div style="font-size:13px;color:#52514e;text-transform:uppercase;letter-spacing:.06em">Setting</div>
  <div style="font-size:16px;margin-bottom:18px">{info['setting']}</div>
  <div style="font-size:64px;font-weight:800;line-height:1;color:{color}">{info['label']}</div>
  <div style="font-size:13px;color:#52514e;margin:4px 0 16px">true label: FAKE</div>
  <div style="font-size:14px;margin-bottom:6px">P(fake) = <b>{info['p']:.3f}</b></div>
  <div style="position:relative;height:16px;background:#e6e5e0;border-radius:8px;overflow:hidden">
    <div style="width:{pct:.1f}%;height:100%;background:{color}"></div>
    <div style="position:absolute;left:50%;top:-2px;bottom:-2px;border-left:2px dashed #0b0b0b"></div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:11px;color:#52514e;margin-top:3px">
    <span>0 (REAL)</span><span>0.5 decision line</span><span>1 (FAKE)</span></div>
  <div style="font-size:16px;margin-top:18px;line-height:1.45">{info['sentence']}</div>
</div>""", unsafe_allow_html=True)

st.caption('One example. Overall results: greedy bots drop GCN from 0.842 to 0.620; '
           'adversarial training brings it back to 0.706.')
