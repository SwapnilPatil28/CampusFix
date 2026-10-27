import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Bookmark, Check, CheckCircle2, ChevronDown, CircleHelp,
  ClipboardList, Clock3, Compass, Hash, HeartHandshake, ImagePlus, LogOut,
  MapPin, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Search, Send, ShieldCheck,
  SlidersHorizontal, Sparkles, ThumbsDown, ThumbsUp, Users, Wrench, X, Zap
} from 'lucide-react';
import { toast } from 'react-toastify';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', withCredentials: true });
const teams = ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'General'];
const categories = ['Facilities', 'IT', 'Security', 'Dining', 'Grounds', 'Other'];
const statuses = ['Open', 'Acknowledged', 'In progress', 'Resolved', 'Reopened'];
const teamIcons = { Facilities: Wrench, IT: Zap, Security: ShieldCheck, Dining: HeartHandshake, Grounds: Sparkles, General: Hash, Other: Hash };
const initials = (name = 'Campus member') => name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
const ago = (date) => {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';
  const delta = Math.max(0, Date.now() - timestamp);
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  if (delta < 30 * 86_400_000) return `${Math.floor(delta / 86_400_000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};
const asset = (url) => !url ? '' : url.startsWith('http') ? url : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${url}`;

function Avatar({ person, size = 'md', className = '' }) {
  return <div className={`avatar avatar-${size} ${className}`} style={{ background: person?.avatarColor || '#dff187' }} title={person?.name}>{initials(person?.name)}</div>;
}

function Pill({ children, className = '' }) { return <span className={`pill ${className}`}>{children}</span>; }

function StatusBadge({ status }) {
  const map = { Open: 'status-open', Acknowledged: 'status-ack', 'In progress': 'status-progress', Resolved: 'status-resolved', Reopened: 'status-reopened' };
  return <Pill className={`status-pill ${map[status] || ''}`}><span className="status-dot" />{status}</Pill>;
}

function Modal({ open, onClose, children, wide = false }) {
  useEffect(() => { if (!open) return undefined; const close = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [open, onClose]);
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}><motion.div className={`modal ${wide ? 'modal-wide' : ''}`} initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .99 }} transition={{ duration: .18 }}>{children}</motion.div></motion.div>}</AnimatePresence>;
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem('campusfix-nav-collapsed') === 'true');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { API.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => {}).finally(() => setAuthChecked(true)); }, []);
  useEffect(() => { setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location.pathname]);
  const signOut = async () => { try { await API.post('/auth/logout'); } finally { setUser(null); toast.success('You’re signed out.'); navigate('/'); } };
  const onAuth = (nextUser) => { setUser(nextUser); setAuthOpen(false); toast.success(`Welcome, ${nextUser.name.split(' ')[0]}!`); };
  const requireUser = (action) => { if (!user) { setAuthOpen(true); return false; } action?.(); return true; };
  const onCreated = (issue) => { setComposeOpen(false); navigate(`/issues/${issue._id}`); toast.success('Your issue is on the campus feed.'); };

  const toggleSidebar = () => setNavCollapsed(value => { const next = !value; localStorage.setItem('campusfix-nav-collapsed', String(next)); return next; });

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark"><Wrench size={20} strokeWidth={2.4} /></span><span>campusfix<span className="brand-period">.</span></span></Link>
      <button className="nav-collapse" onClick={toggleSidebar} title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}>{navCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
      <div className="top-search"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campus issues..." aria-label="Search campus issues" /><kbd>/</kbd></div>
      <div className="top-actions">
        {user ? <button className="account-chip" onClick={signOut} title="Sign out"><Avatar person={user} size="sm" /><span className="account-name">{user.name.split(' ')[0]}</span><LogOut size={15} /></button> : <><button className="button button-quiet top-signin" onClick={() => setAuthOpen(true)}>Sign in</button><button className="button button-dark top-join" onClick={() => setAuthOpen(true)}>Join campusfix <ArrowRight size={16} /></button></>}
        <button className="icon-button mobile-menu" aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileNav(v => !v)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </header>
    <div className={`app-layout ${navCollapsed ? 'layout-collapsed' : ''}`}>
      {mobileNav && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="sidebar-campus"><div className="campus-monogram">N</div><div><strong>Northstar University</strong><span>Student community</span></div><ChevronDown size={15} /></div>
        <div className="side-section"><span className="side-label">CAMPUS</span>
          <NavLink end to="/" title="Explore issues" className={({ isActive }) => `side-link ${isActive ? 'side-active' : ''}`}><Compass size={18} /><span>Explore issues</span></NavLink>
          <button className="side-link" title="Following" onClick={() => requireUser(() => navigate(location.search === '?filter=following' ? '/' : '/?filter=following'))}><Bookmark size={18} /><span>Following</span><span className="side-coming">{user ? '→' : '·'}</span></button>
          {user && ['staff', 'admin'].includes(user.role) && <NavLink to="/staff" title="Operations queue" className={({ isActive }) => `side-link ${isActive ? 'side-active' : ''}`}><ClipboardList size={18} /><span>Ops queue</span><span className="side-count">{user.role === 'admin' ? 'ALL' : user.team.toUpperCase()}</span></NavLink>}
        </div>
        <div className="side-section"><span className="side-label">TEAMS</span>
          {teams.slice(0, 5).map((team) => { const Icon = teamIcons[team]; return <button key={team} className="side-link" title={team} onClick={() => { navigate(`/?team=${encodeURIComponent(team)}`); setMobileNav(false); }}><span className={`team-icon team-${team.toLowerCase()}`}><Icon size={14} /></span><span>{team}</span><span className="team-mark">{team.slice(0, 1)}</span></button>; })}
        </div>
        <button className="sidebar-report" title="Report an issue" onClick={() => requireUser(() => setComposeOpen(true))}><span className="report-plus">+</span><span><strong>Report an issue</strong><small>Share with campus</small></span><ArrowRight size={16} /></button>
        <div className="sidebar-bottom"><div className="sidebar-footer"><span>Campus issues, heard and moving.</span></div></div>
      </aside>
      <main className="main-content"><Routes>
        <Route path="/" element={<Feed search={search} requireUser={requireUser} onCompose={() => requireUser(() => setComposeOpen(true))} />} />
        <Route path="/issues/:id" element={<IssuePage user={user} requireUser={requireUser} onBack={() => navigate(-1)} />} />
        <Route path="/staff" element={<StaffQueue user={user} requireUser={requireUser} />} />
        <Route path="*" element={<Feed search={search} requireUser={requireUser} onCompose={() => requireUser(() => setComposeOpen(true))} />} />
      </Routes></main>
    </div>
    <Modal open={authOpen} onClose={() => setAuthOpen(false)}><AuthPanel onClose={() => setAuthOpen(false)} onAuth={onAuth} /></Modal>
    <Modal open={composeOpen} onClose={() => setComposeOpen(false)} wide><ComposePanel user={user} onClose={() => setComposeOpen(false)} onCreated={onCreated} /></Modal>
    {!authChecked && <div className="app-loading"><span className="loading-mark"><Wrench size={21} /></span><span>Getting campus ready...</span></div>}
  </div>;
}

function Feed({ search, requireUser, onCompose }) {
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ team: '', status: '', category: '', sort: 'recent' });
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const followingOnly = queryParams.get('filter') === 'following';
  useEffect(() => { const team = queryParams.get('team') || ''; setFilters(f => ({ ...f, team })); }, [queryParams]);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await API.get('/issues', { params: { q: search || undefined, team: filters.team || undefined, status: filters.status || undefined, category: filters.category || undefined, sort: filters.sort, following: followingOnly ? '1' : undefined } });
      setIssues(data.issues); setTotal(data.total || 0); setSummary(data.summary || {});
    } catch (err) { setError(err.response?.data?.message || 'Campus feed couldn’t load. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [search, filters, followingOnly]);
  useEffect(() => { const timer = setTimeout(refresh, 240); return () => clearTimeout(timer); }, [refresh]);
  const patchIssue = (updated) => setIssues(items => items.map(issue => issue._id === updated._id ? updated : issue));
  const loadMore = async () => {
    if (loadingMore || issues.length >= total) return;
    setLoadingMore(true);
    try {
      const { data } = await API.get('/issues', { params: { q: search || undefined, team: filters.team || undefined, status: filters.status || undefined, category: filters.category || undefined, sort: filters.sort, following: followingOnly ? '1' : undefined, page: Math.floor(issues.length / 20) + 1 } });
      setIssues(items => [...items, ...data.issues]); setTotal(data.total || 0);
    } catch (err) { toast.error(err.response?.data?.message || 'Could not load more issues.'); }
    finally { setLoadingMore(false); }
  };
  const update = async (issue, action, payload) => {
    if (!requireUser()) return;
    try { const { data } = await API.post(`/issues/${issue._id}/${action}`, payload); patchIssue(data.issue); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not save that action.'); }
  };
  return <div className="feed-page">
    <div className="feed-hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS, YOUR VOICE</div><h1>A better campus<br />starts with <em>being heard.</em></h1><p>Spot something that needs fixing? Share it, find your people, and help move it forward.</p><button className="button button-lime hero-cta" onClick={onCompose}>Report an issue <ArrowRight size={17} /></button></div><div className="hero-art"><div className="hero-sun" /><div className="campus-building"><span className="building-roof" /><span className="building-cap" /><span className="building-body"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span className="building-door" /></div><div className="hero-bubble bubble-one"><Check size={13} /> Heard & noted</div><div className="hero-bubble bubble-two"><span className="bubble-spark">✳</span> Better together</div><div className="hero-doodle">✳</div></div><div className="hero-note"><span>01</span> EVERY VOICE COUNTS <span className="note-rule" /></div></div>
    <div className="feed-main-column">
      <div className="feed-header"><div><div className="section-kicker">{followingOnly ? 'ISSUES YOU FOLLOW' : 'THE COMMUNITY BOARD'}</div><h2>{followingOnly ? 'Your followed issues' : 'Campus conversations'} <span className="feed-live" /></h2></div><button className="button button-dark feed-report" onClick={onCompose}><span>+</span> New report</button></div>
      <div className="feed-summary"><div><span className="summary-icon summary-open"><Zap size={16} /></span><span><strong>{summary.Open ?? '—'}</strong><small>needs attention</small></span></div><i /><div><span className="summary-icon summary-moving"><ArrowRight size={16} /></span><span><strong>{summary['In progress'] ?? '—'}</strong><small>being worked on</small></span></div><i /><div><span className="summary-icon summary-fixed"><CheckCircle2 size={16} /></span><span><strong>{summary.Resolved ?? '—'}</strong><small>fixed together</small></span></div></div>
      <div className="feed-controls"><div className="feed-tabs"><button className={!filters.status ? 'tab-active' : ''} onClick={() => setFilters(f => ({ ...f, status: '' }))}>All issues</button>{['Open', 'In progress', 'Resolved'].map(status => <button key={status} className={filters.status === status ? 'tab-active' : ''} onClick={() => setFilters(f => ({ ...f, status }))}>{status === 'In progress' ? 'In progress' : status}</button>)}</div><button className="filter-trigger" onClick={() => document.querySelector('.filter-popover')?.classList.toggle('filter-show')}><SlidersHorizontal size={15} /> Filter</button><select className="sort-select" value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} aria-label="Sort issues"><option value="recent">Most recent</option><option value="trending">Trending</option><option value="oldest">Oldest first</option></select></div>
      <div className="filter-popover"><div className="filter-popover-head">Filter issues <button onClick={() => setFilters(f => ({ ...f, category: '', team: '', status: '' }))}>Clear all</button></div><label>Operations team<select value={filters.team} onChange={e => setFilters(f => ({ ...f, team: e.target.value }))}><option value="">Every team</option>{teams.map(team => <option key={team}>{team}</option>)}</select></label><label>Category<select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}><option value="">Every category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label>Status<select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}><option value="">Every status</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></label></div>
      {error && <div className="state-card error-state"><span className="state-icon"><CircleHelp size={20} /></span><strong>We couldn’t load the feed</strong><p>{error}</p><button className="button button-outline" onClick={refresh}>Try again</button></div>}
      {loading && !issues.length && <div className="feed-skeletons"><div /><div /><div /></div>}
      {!loading && !error && issues.length === 0 && <div className="state-card"><span className="state-icon"><Search size={20} /></span><strong>{search || filters.team || filters.category || filters.status ? 'No issues match those filters' : 'Your campus board is clear'}</strong><p>{search || filters.team || filters.category || filters.status ? 'Try broadening your search or clearing a filter.' : 'Be the first to report something that could make campus better.'}</p><button className="button button-lime" onClick={onCompose}>Share an issue <ArrowRight size={15} /></button></div>}
      <div className="issue-list">{issues.map((issue, index) => <IssueCard key={issue._id} issue={issue} index={index} onVote={(response) => update(issue, 'vote', { response: issue.myVote === response ? 'clear' : response })} onFollow={() => update(issue, 'follow')} onOpen={() => navigate(`/issues/${issue._id}`)} />)}</div>
      {!loading && issues.length < total && <button className="load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading more...' : `Load more issues (${total - issues.length} remaining)`} <ArrowRight size={14} /></button>}
      <div className="feed-end"><span className="end-star">✳</span><span>That’s everything for now.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></div>
    </div>
  </div>;
}

function IssueCard({ issue, index = 0, onVote, onFollow, onOpen }) {
  return <motion.article className="issue-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .045, .2) }}>
    <div className="issue-topline"><div className="issue-author"><Avatar person={issue.author} size="sm" /><div><strong>{issue.author?.name || 'Campus member'}</strong><span>{ago(issue.createdAt)} <b>·</b> <MapPin size={11} /> {issue.location}</span></div></div><button className={`follow-button ${issue.isFollowing ? 'is-following' : ''}`} title={issue.isFollowing ? 'Unfollow issue' : 'Follow issue'} onClick={onFollow}>{issue.isFollowing ? <Bookmark size={16} fill="currentColor" /> : <Bookmark size={16} />}</button></div>
    <div className="issue-content" onClick={onOpen} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen()}><div className="issue-tags"><Pill className="category-pill">{issue.category}</Pill><StatusBadge status={issue.status} /></div><h3>{issue.title}</h3><p className="issue-description">{issue.description}</p>{issue.imageUrl && <img className="issue-photo" src={asset(issue.imageUrl)} alt="Photo attached to the reported issue" />}{issue.videoUrl && <video className="issue-video" src={asset(issue.videoUrl)} controls playsInline preload="metadata" aria-label="Video attached to the reported issue" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} />}</div>
    <div className="issue-footer"><div className="impact-actions"><button className={`impact-button ${issue.myVote === 'affected' ? 'impact-selected' : ''}`} onClick={() => onVote('affected')} title="Say you’re affected"><ThumbsUp size={15} /><span>I’m affected</span><strong>{issue.affectedCount || 0}</strong></button><button className={`impact-button impact-no ${issue.myVote === 'not-affected' ? 'impact-selected-no' : ''}`} onClick={() => onVote('not-affected')} title="Say you haven’t experienced it"><ThumbsDown size={15} /><span>Not me</span><strong>{issue.notAffectedCount || 0}</strong></button></div><button className="comment-count" onClick={onOpen}><MessageCircle size={15} /> {issue.commentsCount || 0} <span>comments</span><ArrowRight size={13} /></button></div>
    {issue.updates?.length > 1 && <div className="latest-update"><span className="update-check"><Check size={12} /></span><span><strong>{issue.updates.at(-1)?.author?.name || 'Operations'} </strong>{issue.updates.at(-1)?.note || `updated status to ${issue.status.toLowerCase()}`}</span><span className="update-time">{ago(issue.updates.at(-1)?.createdAt)}</span></div>}
  </motion.article>;
}

function CommentItem({ item, user, onLike, onReply, onDelete }) {
  const author = item.author && typeof item.author === 'object' ? item.author : null;
  const authorId = String(author?._id || item.author || '');
  const liked = (item.likedBy || []).some(person => String(person?._id || person) === String(user?.id));
  return <div className="comment-item">
    <Avatar person={author} size="sm" />
    <div className="comment-body">
      <div className="comment-byline">
        <strong>{author?.name || 'Campus member'}</strong>
        {item.staffReply && <Pill className="staff-reply-pill"><ShieldCheck size={11} /> Operations</Pill>}
        <time dateTime={item.createdAt || undefined}>{ago(item.createdAt)}</time>
      </div>
      <p>{item.body || item.text || 'This comment has no text.'}</p>
      <div className="comment-actions">
        {!item.legacy && <button type="button" onClick={() => onLike(item)}>{liked ? 'Liked' : 'Like'} · {item.likes || 0}</button>}
        <button type="button" onClick={() => onReply(author?.name)}>Reply</button>
        {!item.legacy && user && authorId === String(user.id) && <button type="button" className="comment-delete" onClick={() => onDelete(item._id)}>Delete</button>}
      </div>
    </div>
  </div>;
}

function IssuePage({ user, requireUser, onBack }) {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const refresh = useCallback(async () => { setLoading(true); setError(''); try { const { data } = await API.get(`/issues/${id}`); setIssue(data.issue); } catch (err) { setError(err.response?.data?.message || 'This issue could not be loaded.'); } finally { setLoading(false); } }, [id]);
  useEffect(() => { refresh(); }, [refresh]);
  const update = async (url, body = {}) => { if (!requireUser()) return; try { const { data } = await API.post(url, body); setIssue(data.issue); return data.issue; } catch (err) { toast.error(err.response?.data?.message || 'Could not save that action.'); } };
  const postComment = async (e) => { e.preventDefault(); const body = comment.trim(); if (!body || posting) return; setPosting(true); try { const { data } = await API.post(`/issues/${id}/comments`, { body }); setIssue(current => ({ ...current, comments: [...current.comments, data.comment], commentsCount: (current.commentsCount || 0) + 1, isFollowing: true })); setComment(''); } catch (err) { toast.error(err.response?.data?.message || 'Could not post your comment.'); } finally { setPosting(false); } };
  const deleteComment = async (commentId) => { try { await API.delete(`/issues/${id}/comments/${commentId}`); setIssue(current => ({ ...current, comments: current.comments.filter(item => item._id !== commentId), commentsCount: Math.max(0, (current.commentsCount || 1) - 1) })); toast.success('Comment deleted.'); } catch (err) { toast.error(err.response?.data?.message || 'Could not delete your comment.'); } };
  const toggleCommentLike = async (item) => { if (!requireUser()) return; const liked = (item.likedBy || []).some(person => String(person?._id || person) === String(user.id)); try { const method = liked ? 'delete' : 'post'; const { data } = await API.request({ method, url: `/issues/${id}/comments/${item._id}/like` }); setIssue(current => ({ ...current, comments: current.comments.map(commentItem => commentItem._id === item._id ? data.comment : commentItem) })); } catch (err) { toast.error(err.response?.data?.message || 'Could not update the comment reaction.'); } };
  const replyToComment = (name) => { if (!requireUser()) return; document.querySelector('.comment-composer textarea')?.focus(); setComment(value => value ? `${value} @${name || 'member'} ` : `@${name || 'member'} `); };
  const changeStatus = async (status) => { const response = await API.patch(`/issues/${id}/status`, { status, note: statusNote }).then(r => r.data.issue).catch(err => { toast.error(err.response?.data?.message || 'Could not update status.'); return null; }); if (response) { setIssue(response); setStatusNote(''); toast.success('Issue status updated.'); } };
  if (loading) return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to the board</button><div className="detail-skeleton" /></div>;
  if (error || !issue) return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to the board</button><div className="state-card error-state"><CircleHelp /><strong>Issue not available</strong><p>{error}</p><button className="button button-outline" onClick={refresh}>Try again</button></div></div>;
  const canManage = user && ['staff', 'admin'].includes(user.role) && (user.role === 'admin' || user.team === issue.team || user.team === 'General');
  return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to the board</button><div className="detail-layout"><section className="detail-main"><article className="detail-card"><div className="issue-topline"><div className="issue-author"><Avatar person={issue.author} size="sm" /><div><strong>{issue.author?.name || 'Campus member'}</strong><span>{ago(issue.createdAt)} <b>·</b> <MapPin size={11} /> {issue.location}</span></div></div><StatusBadge status={issue.status} /></div><div className="issue-tags detail-tags"><Pill className="category-pill">{issue.category}</Pill></div><h1>{issue.title}</h1><p className="detail-description">{issue.description}</p>{issue.imageUrl && <img className="detail-photo" src={asset(issue.imageUrl)} alt="Photo attached to the reported issue" />}{issue.videoUrl && <video className="detail-video" src={asset(issue.videoUrl)} controls playsInline preload="metadata" aria-label="Video attached to the reported issue" />}<div className="detail-meta"><span><MapPin size={15} />{issue.location}</span><span><Clock3 size={15} />Reported {new Date(issue.createdAt).toLocaleDateString()}</span></div><div className="detail-impacts"><span className="impact-label">CAMPUS IMPACT</span><p>{issue.affectedCount} {issue.affectedCount === 1 ? 'person is' : 'people are'} affected by this</p><div className="impact-buttons"><button className={`button ${issue.myVote === 'affected' ? 'button-lime' : 'button-outline'}`} onClick={() => update(`/issues/${id}/vote`, { response: issue.myVote === 'affected' ? 'clear' : 'affected' })}><ThumbsUp size={15} /> I’m affected <b>{issue.affectedCount}</b></button><button className={`button ${issue.myVote === 'not-affected' ? 'button-selected-muted' : 'button-outline'}`} onClick={() => update(`/issues/${id}/vote`, { response: issue.myVote === 'not-affected' ? 'clear' : 'not-affected' })}><ThumbsDown size={15} /> Haven’t experienced it <b>{issue.notAffectedCount}</b></button></div></div><div className="detail-actions"><button className={`button button-outline ${issue.isFollowing ? 'button-following' : ''}`} onClick={() => update(`/issues/${id}/follow`)}>{issue.isFollowing ? <Check size={15} /> : <Bookmark size={15} />}{issue.isFollowing ? 'Following updates' : 'Follow updates'}</button><button className="button button-quiet" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Issue link copied.'); }}><Send size={15} /> Share</button></div></article>
      <section className="comments-panel">
        <div className="comments-title"><div><span className="section-kicker">KEEP THE CONVERSATION USEFUL</span><h2>Community discussion <span>{issue.commentsCount ?? issue.comments.length}</span></h2></div><span className="discussion-note"><Users size={14} /> Be kind, stay constructive</span></div>
        <form className="comment-composer" onSubmit={postComment}>
          <Avatar person={user || { name: 'Guest' }} size="sm" />
          <div className="comment-input-wrap"><textarea value={comment} onChange={e => setComment(e.target.value)} onFocus={() => !user && requireUser()} placeholder={user ? 'Add context, a helpful detail, or a question...' : 'Sign in to join the conversation'} maxLength={1200} rows={3} /><div className="comment-compose-bottom"><span>{comment.length}/1200</span><button className="button button-dark" disabled={!comment.trim() || posting}>{posting ? 'Posting...' : 'Comment'} <Send size={14} /></button></div></div>
        </form>
        <div className="comments-list">{issue.comments.length ? issue.comments.map((item, index) => <CommentItem key={item._id || index} item={item} user={user} onLike={toggleCommentLike} onReply={replyToComment} onDelete={deleteComment} />) : <div className="empty-comments"><MessageCircle size={20} /><span>No comments yet. Add the first helpful detail.</span></div>}</div>
      </section>
      </section><aside className="detail-side"><div className="team-response-card"><div className="response-card-icon"><ShieldCheck size={19} /></div><span className="section-kicker">ROUTED TO</span><h3>{issue.team}</h3><p>The right campus team has been tagged. Their updates will appear here as they work on it.</p><div className="team-response-foot"><span className="response-online" /> {issue.status === 'Open' ? 'Waiting for a team response' : 'Team is on this'}</div></div>{canManage && <div className="staff-update-card"><div className="staff-update-head"><span className="response-card-icon"><ClipboardList size={18} /></span><div><span className="section-kicker">STAFF TOOLS</span><h3>Update this issue</h3></div></div><label>Status<select value={issue.status} onChange={e => changeStatus(e.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label><label>Public note <textarea value={statusNote} maxLength={500} onChange={e => setStatusNote(e.target.value)} placeholder="Share an update with students..." /></label><small>Updates are visible to everyone following this issue.</small></div>}<div className="timeline-card"><span className="section-kicker">ISSUE TIMELINE</span>{issue.updates.slice().reverse().map((update, index) => <div className="timeline-entry" key={update._id || index}><span className={`timeline-icon ${index === 0 ? 'timeline-current' : ''}`}>{update.status === 'Resolved' ? <Check size={12} /> : <span />}</span><div><strong>{update.status}</strong><p>{update.note || `Status updated by ${update.author?.name || 'Campus operations'}`}</p><small>{ago(update.createdAt)}</small></div></div>)}</div></aside></div></div>;
}

function StaffQueue({ user, requireUser }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All open');
  const navigate = useNavigate();
  const load = useCallback(async () => { if (!user || !['staff', 'admin'].includes(user.role)) return setLoading(false); setLoading(true); try { const { data } = await API.get('/issues/staff/queue'); setIssues(data.issues); } catch (err) { toast.error(err.response?.data?.message || 'Could not load the operations queue.'); } finally { setLoading(false); } }, [user]);
  useEffect(() => { load(); }, [load]);
  if (!user) return <div className="staff-page"><div className="state-card"><span className="state-icon"><ShieldCheck size={20} /></span><strong>Operations workspace</strong><p>Sign in with a campus operations account to view routed issues.</p><button className="button button-dark" onClick={() => requireUser()}>Sign in <ArrowRight size={15} /></button></div></div>;
  if (!['staff', 'admin'].includes(user.role)) return <div className="staff-page"><div className="state-card"><span className="state-icon"><ShieldCheck size={20} /></span><strong>Staff access required</strong><p>The operations queue is only available to campus staff.</p><Link className="button button-outline" to="/">Back to the community board</Link></div></div>;
  const shown = issues.filter(i => filter === 'All open' || i.status === filter);
  const stats = { Open: issues.filter(i => i.status === 'Open').length, Acknowledged: issues.filter(i => i.status === 'Acknowledged').length, 'In progress': issues.filter(i => i.status === 'In progress').length };
  return <div className="staff-page"><div className="staff-hero"><div><div className="eyebrow"><span className="eyebrow-line" /> OPERATIONS WORKSPACE</div><h1>Good work starts<br />with <em>listening.</em></h1><p>One place to hear what students are experiencing and show them what’s being done.</p></div><div className="staff-hero-badge"><div className="staff-badge-icon"><ClipboardList size={21} /></div><span>YOUR TEAM</span><strong>{user.role === 'admin' ? 'All departments' : user.team}</strong><small><i /> Operations portal</small></div></div><div className="staff-stats"><div><span className="staff-stat-icon stat-amber"><Zap size={17} /></span><strong>{stats.Open}</strong><small>Open</small></div><div><span className="staff-stat-icon stat-blue"><Clock3 size={17} /></span><strong>{stats.Acknowledged}</strong><small>Acknowledged</small></div><div><span className="staff-stat-icon stat-lime"><Wrench size={17} /></span><strong>{stats['In progress']}</strong><small>In progress</small></div><div className="staff-respond-rate"><div><strong>Issue queue</strong><span>{issues.length} active reports</span></div><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div></div><div className="queue-head"><div><span className="section-kicker">STUDENT REPORTS</span><h2>What needs your attention?</h2></div><select value={filter} onChange={e => setFilter(e.target.value)}><option>All open</option><option>Open</option><option>Acknowledged</option><option>In progress</option></select></div>{loading ? <div className="feed-skeletons"><div /><div /></div> : shown.length ? <div className="issue-list">{shown.map((issue, index) => <div key={issue._id} className="queue-item"><IssueCard issue={issue} index={index} onOpen={() => navigate(`/issues/${issue._id}`)} onVote={() => navigate(`/issues/${issue._id}`)} onFollow={() => navigate(`/issues/${issue._id}`)} /><div className="queue-item-actions"><span><Clock3 size={14} /> Open {ago(issue.createdAt)}</span><button className="button button-outline" onClick={() => navigate(`/issues/${issue._id}`)}>Review issue <ArrowRight size={15} /></button></div></div>)}</div> : <div className="state-card"><span className="state-icon"><CheckCircle2 size={20} /></span><strong>All caught up</strong><p>There are no reports in this view right now.</p></div>}</div>;
}

function ComposePanel({ user, onClose, onCreated }) {
  const categoryInfo = {
    Facilities: { label: 'Facilities & maintenance', team: 'Facilities', note: 'Repairs, lighting, water, furniture, and shared rooms.' },
    IT: { label: 'Technology & connectivity', team: 'IT', note: 'Campus Wi-Fi, classroom devices, and student systems.' },
    Security: { label: 'Safety & security', team: 'Security', note: 'Lighting, access, and safety concerns.' },
    Dining: { label: 'Dining & food', team: 'Dining', note: 'Dining halls, meal service, and food options.' },
    Grounds: { label: 'Outdoor spaces & grounds', team: 'Grounds', note: 'Paths, lawns, outdoor seating, and campus grounds.' },
    Other: { label: 'Other campus issue', team: 'General', note: 'The campus team will review and route this report.' }
  };
  const [form, setForm] = useState({ title: '', description: '', category: 'Facilities', location: '' });
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const reportData = new FormData();
      Object.entries(form).forEach(([key, value]) => reportData.append(key, value));
      if (media) reportData.append(media.type.startsWith('video/') ? 'video' : 'image', media);
      const route = media?.type.startsWith('video/') ? '/issues/video' : '/issues';
      const { data } = await API.post(route, reportData);
      onCreated(data.issue);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not publish your report. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const handleMedia = (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return toast.error('Choose an image or video file.');
    if (file.size > (isImage ? 5 : 50) * 1024 * 1024) return toast.error(isImage ? 'Image must be 5 MB or smaller.' : 'Video must be 50 MB or smaller.');
    setMedia(file);
    setPreview(URL.createObjectURL(file));
  };
  return <>
    <div className="modal-header">
      <div><span className="section-kicker">CAMPUS ISSUE REPORT</span><h2>What needs attention?</h2><p>Share enough detail for students and the right team to understand it.</p></div>
      <button className="icon-button" onClick={onClose} aria-label="Close report form"><X size={19} /></button>
    </div>
    <form className="compose-form" onSubmit={submit}>
      <div className="compose-author"><Avatar person={user || { name: 'You' }} /><div><strong>Posting as {user?.name || 'you'}</strong><span>Your report will be visible to the campus community.</span></div></div>
      <div className="form-section-title"><span>01</span><div><strong>Issue details</strong><small>What is happening, and where?</small></div></div>
      <label>Short title <span className="required-star">*</span><input required maxLength={120} value={form.title} onChange={event => set('title', event.target.value)} placeholder="e.g. Water fountain leaking in the library" /><small className="form-counter">{form.title.length}/120</small></label>
      <label>Issue type <span className="required-star">*</span><select value={form.category} onChange={event => set('category', event.target.value)} required>{categories.map(category => <option key={category} value={category}>{categoryInfo[category].label}</option>)}</select><small className="field-hint">{categoryInfo[form.category].note}</small></label>
      <div className="auto-route-card"><span className={`team-icon team-${categoryInfo[form.category].team.toLowerCase()}`}><Wrench size={15} /></span><div><small>ROUTED TO</small><strong>{categoryInfo[form.category].team} operations</strong></div><CheckCircle2 size={17} /></div>
      <label>Campus location <span className="required-star">*</span><div className="input-with-icon"><MapPin size={16} /><input required maxLength={120} value={form.location} onChange={event => set('location', event.target.value)} placeholder="Building, room, floor, or nearby landmark" /></div></label>
      <label>What should the team know? <span className="required-star">*</span><textarea required maxLength={3000} rows={4} value={form.description} onChange={event => set('description', event.target.value)} placeholder="Describe what you noticed, when it happens, and how it affects students." /><small className="form-counter">{form.description.length}/3000</small></label>
      <div className="form-section-title"><span>02</span><div><strong>Add media <small>Optional</small></strong><small>A photo or short video can help the team understand the issue.</small></div></div>
      <div className="attachment-area">{preview ? <div className="image-preview">{media?.type.startsWith('video/') ? <video src={preview} controls playsInline /> : <img src={preview} alt="Preview of selected campus issue" />}<button type="button" className="remove-image" onClick={() => { setMedia(null); setPreview(''); }}>Remove attachment <X size={14} /></button></div> : <label className="attachment-button"><input type="file" accept="image/*,video/*" onChange={event => handleMedia(event.target.files?.[0])} /><ImagePlus size={17} /><span><strong>Choose a photo or video</strong><small>Image up to 5 MB · video up to 50 MB</small></span><span className="attach-plus">+</span></label>}</div>
      <div className="compose-tip"><Sparkles size={15} /><span>Reports are public. Please avoid including private information or photos of people without permission.</span></div>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-lime" disabled={saving}>{saving ? 'Publishing...' : 'Publish issue'} <ArrowRight size={16} /></button></div>
    </form>
  </>;
}
function AuthPanel({ onClose, onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { const { data } = await API.post(`/auth/${mode}`, form); onAuth(data.user); } catch (err) { setError(err.response?.data?.message || 'Could not sign you in. Check your connection and try again.'); } finally { setLoading(false); } };
  const demo = async (email) => { setLoading(true); setError(''); try { const { data } = await API.post('/auth/login', { email, password: 'CampusFix2026!' }); onAuth(data.user); } catch (err) { setError(err.response?.data?.message || 'Demo accounts are not set up yet. Follow the README to seed sample data.'); } finally { setLoading(false); } };
  return <><div className="auth-brand"><span className="brand-mark"><Wrench size={20} /></span><strong>campusfix<span className="brand-period">.</span></strong><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="auth-heading"><span className="section-kicker">YOUR VOICE, YOUR CAMPUS</span><h2>{mode === 'login' ? 'Welcome back.' : 'Join the conversation.'}</h2><p>{mode === 'login' ? 'Sign in to share, follow, and help move campus issues forward.' : 'Create an account and help make campus better for everyone.'}</p></div>{error && <div className="auth-error">{error}</div>}<form className="auth-form" onSubmit={submit}>{mode === 'register' && <label>Your name<input required autoComplete="name" maxLength={80} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" /></label>}<label>Campus email<input required type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@university.edu" /></label><label>Password<input required type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : 1} value={form.password} onChange={e => set('password', e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} /></label><button className="button button-dark auth-submit" disabled={loading}>{loading ? 'One moment...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button></form><div className="auth-switch">{mode === 'login' ? 'New to CampusFix?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div><details className="demo-details"><summary><Sparkles size={14} /> Try CampusFix with demo accounts</summary><div><button disabled={loading} onClick={() => demo('student@campusfix.demo')}><span>Student view</span><small>student@campusfix.demo</small></button><button disabled={loading} onClick={() => demo('facilities@campusfix.demo')}><span>Facilities staff</span><small>facilities@campusfix.demo</small></button></div><small>Demo password: CampusFix2026! · Add data with <code>npm run seed</code> in backend first.</small></details><div className="auth-privacy"><ShieldCheck size={15} /> Your password is encrypted. We never post on your behalf.</div></>;
}

export default App;
