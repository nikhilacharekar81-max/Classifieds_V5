'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { HANDCRAFTED_SEO_CONTENT, SeoContentEntry } from '@/lib/data/seoContentData';
import {
  FileText,
  Globe,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  RefreshCw,
  Eye,
  X,
  Save,
  CheckCircle2,
  MapPin,
  Sparkles,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { CmsPage } from '@/lib/types';

export const CmsSeoModule: React.FC = () => {
  const { cmsPages, updateCmsPage, addCmsPage, deleteCmsPage, openCmsPageModal, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'pages' | 'seo' | 'city_content'>('pages');
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Local state for city content manager
  const [seoContentList, setSeoContentList] = useState<SeoContentEntry[]>(
    Object.values(HANDCRAFTED_SEO_CONTENT)
  );
  const [citySearch, setCitySearch] = useState('');
  const [editingSeoEntry, setEditingSeoEntry] = useState<SeoContentEntry | null>(null);

  // New page form state
  const [newPageData, setNewPageData] = useState<Omit<CmsPage, 'id' | 'updatedAt'>>({
    title: '',
    slug: '',
    category: 'Legal',
    content: '',
    status: 'published',
  });

  const [seoConfig, setSeoConfig] = useState({
    titleTemplate: 'Used {category} in {city} for Sale - Chillyads.com',
    metaDescTemplate: 'Find {total_count}+ verified second-hand {category} in {city}. Compare prices, inspect genuine photos, and connect directly with sellers on Chillyads.',
    canonicalDomain: 'https://www.chillyads.com',
    robotsTxt: `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /impersonate/\nSitemap: https://www.chillyads.com/sitemap.xml`,
  });

  const handleSavePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPage) {
      updateCmsPage(editingPage);
      setEditingPage(null);
    } else if (isCreatingNew) {
      if (!newPageData.title || !newPageData.slug) {
        addToast({ type: 'error', title: 'Missing Title or Slug', message: 'Please enter a title and unique URL slug.' });
        return;
      }
      addCmsPage(newPageData);
      setIsCreatingNew(false);
      setNewPageData({
        title: '',
        slug: '',
        category: 'Legal',
        content: '',
        status: 'published',
      });
    }
  };

  const handleSaveSeo = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'SEO Templates Updated',
      message: 'Global category title & meta description templates regenerated.',
    });
  };

  const handleRegenerateSitemap = () => {
    addToast({
      type: 'info',
      title: 'XML Sitemap Generated',
      message: 'Regenerated indexed category, city, and listing URLs.',
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Content Management & Legal Pages</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and edit Privacy Policy, Terms & Conditions, Safety Tips, Report Ad/User pages, and SEO metadata
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingNew(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Create New CMS Page
          </button>

          <button
            onClick={handleRegenerateSitemap}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Ping Sitemaps
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('pages')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'pages'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Footer & Legal Pages ({cmsPages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('city_content')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'city_content'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>City & Category Unique Guides ({seoContentList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('seo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'seo'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>SEO Metadata & Canonical Rules</span>
        </button>
      </div>

      {activeTab === 'pages' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3">Page Title</th>
                  <th className="p-3">URL Slug</th>
                  <th className="p-3">Topic / Category</th>
                  <th className="p-3">Last Updated</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cmsPages.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{p.title}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">/{p.slug}</td>
                    <td className="p-3">
                      <Badge variant="info">{p.category}</Badge>
                    </td>
                    <td className="p-3 text-slate-400">{p.updatedAt}</td>
                    <td className="p-3">
                      <Badge variant={p.status === 'published' ? 'success' : 'neutral'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openCmsPageModal(p.slug)}
                          title="Preview Page"
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-500" /> Preview
                        </button>

                        <button
                          onClick={() => setEditingPage(p)}
                          className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-[11px] flex items-center gap-1 hover:bg-blue-100 transition"
                        >
                          <Edit3 className="w-3 h-3" /> Edit Content
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete page "${p.title}"?`)) {
                              deleteCmsPage(p.id);
                            }
                          }}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'seo' && (
        <form onSubmit={handleSaveSeo} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-w-2xl space-y-4 text-xs">
          <h3 className="text-base font-bold">Dynamic Programmatic SEO Configuration</h3>
          <p className="text-xs text-slate-500">
            Use variables like <code className="text-blue-600">{'{category}'}</code>, <code className="text-blue-600">{'{city}'}</code>, <code className="text-blue-600">{'{state}'}</code>, and <code className="text-blue-600">{'{total_count}'}</code>
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block font-semibold mb-1">Global Title Template *</label>
              <input
                type="text"
                required
                value={seoConfig.titleTemplate}
                onChange={(e) => setSeoConfig({ ...seoConfig, titleTemplate: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Meta Description Template *</label>
              <textarea
                rows={3}
                required
                value={seoConfig.metaDescTemplate}
                onChange={(e) => setSeoConfig({ ...seoConfig, metaDescTemplate: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Canonical Domain</label>
              <input
                type="text"
                value={seoConfig.canonicalDomain}
                onChange={(e) => setSeoConfig({ ...seoConfig, canonicalDomain: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Robots.txt Content</label>
              <textarea
                rows={4}
                value={seoConfig.robotsTxt}
                onChange={(e) => setSeoConfig({ ...seoConfig, robotsTxt: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
            >
              Save Global SEO Configuration
            </button>
          </div>
        </form>
      )}

      {activeTab === 'city_content' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>60–100 Word Unique City & Category Guides</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every city homepage and category landing page displays a distinct, human-written guide above the footer.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search location or category..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seoContentList
              .filter(
                (item) =>
                  !citySearch ||
                  item.locationKey.toLowerCase().includes(citySearch.toLowerCase()) ||
                  item.categoryKey.toLowerCase().includes(citySearch.toLowerCase()) ||
                  item.title.toLowerCase().includes(citySearch.toLowerCase())
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-blue-500/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="capitalize">{item.locationKey.replace(/_/g, ' ')}</span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-slate-500 font-medium">{item.categoryKey}</span>
                      </div>

                      <Badge variant="info">{item.wordCount} Words</Badge>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Updated: {item.lastUpdated}
                    </span>

                    <button
                      onClick={() => setEditingSeoEntry({ ...item })}
                      className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-[11px] flex items-center gap-1 hover:bg-blue-100 transition"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Guide
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* City SEO Entry Modal */}
      {editingSeoEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Edit Local Guide: {editingSeoEntry.locationKey.toUpperCase()}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Target Category: <code className="text-blue-600">{editingSeoEntry.categoryKey}</code>
                </p>
              </div>

              <button
                onClick={() => setEditingSeoEntry(null)}
                className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Guide Section Title *</label>
                <input
                  type="text"
                  value={editingSeoEntry.title}
                  onChange={(e) =>
                    setEditingSeoEntry({ ...editingSeoEntry, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-semibold">
                    Local Guide Paragraph (60–100 Words) *
                  </label>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    {editingSeoEntry.content.trim().split(/\s+/).filter(Boolean).length} Words
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={editingSeoEntry.content}
                  onChange={(e) => {
                    const text = e.target.value;
                    const words = text.trim().split(/\s+/).filter(Boolean).length;
                    setEditingSeoEntry({
                      ...editingSeoEntry,
                      content: text,
                      wordCount: words,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 leading-relaxed text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSeoEntry(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSeoContentList((prev) =>
                      prev.map((item) =>
                        item.id === editingSeoEntry.id
                          ? { ...editingSeoEntry, lastUpdated: new Date().toISOString().split('T')[0] }
                          : item
                      )
                    );
                    addToast({
                      type: 'success',
                      title: 'Local Guide Updated',
                      message: `Updated guide for ${editingSeoEntry.locationKey} (${editingSeoEntry.wordCount} words).`,
                    });
                    setEditingSeoEntry(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" /> Save Guide Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Edit / Create Modal */}
      {(editingPage || isCreatingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingPage ? `Edit Page: ${editingPage.title}` : 'Create New CMS Page'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Update content rendered on footer links and dynamic policy routes
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingPage(null);
                  setIsCreatingNew(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePage} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Page Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Terms of Service"
                    value={editingPage ? editingPage.title : newPageData.title}
                    onChange={(e) => {
                      if (editingPage) {
                        setEditingPage({ ...editingPage, title: e.target.value });
                      } else {
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '');
                        setNewPageData({ ...newPageData, title: e.target.value, slug });
                      }
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">URL Slug *</label>
                  <div className="flex items-center">
                    <span className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-700 text-slate-500 rounded-l-xl font-mono text-[11px]">
                      /
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="terms-and-conditions"
                      value={editingPage ? editingPage.slug : newPageData.slug}
                      onChange={(e) => {
                        const slug = e.target.value.toLowerCase().replace(/\s+/g, '-');
                        if (editingPage) setEditingPage({ ...editingPage, slug });
                        else setNewPageData({ ...newPageData, slug });
                      }}
                      className="w-full text-xs rounded-r-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Category / Topic *</label>
                  <select
                    value={editingPage ? editingPage.category : newPageData.category}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      if (editingPage) setEditingPage({ ...editingPage, category: cat });
                      else setNewPageData({ ...newPageData, category: cat });
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                  >
                    <option value="Legal">Legal</option>
                    <option value="Trust & Safety">Trust & Safety</option>
                    <option value="Support & Help">Support & Help</option>
                    <option value="About">About</option>
                    <option value="Blog / Guides">Blog / Guides</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Publishing Status *</label>
                  <select
                    value={editingPage ? editingPage.status : newPageData.status}
                    onChange={(e) => {
                      const st = e.target.value as any;
                      if (editingPage) setEditingPage({ ...editingPage, status: st });
                      else setNewPageData({ ...newPageData, status: st });
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold">Page Content (Supports Markdown: ### Headings, - Lists, **Bold**) *</label>
                  <span className="text-[10px] text-slate-400">Live preview enabled in modal</span>
                </div>
                <textarea
                  rows={12}
                  required
                  value={editingPage ? editingPage.content : newPageData.content}
                  onChange={(e) => {
                    if (editingPage) setEditingPage({ ...editingPage, content: e.target.value });
                    else setNewPageData({ ...newPageData, content: e.target.value });
                  }}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPage(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4" /> Save & Publish Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
