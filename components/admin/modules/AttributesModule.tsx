'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { CustomFieldDefinition } from '@/lib/types';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  HelpCircle,
  Eye,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { useRouter, navigateTo } from '@/lib/router/useRouter';

export const AttributesModule: React.FC = () => {
  const { categories, customFields, addCustomField, updateCustomField, deleteCustomField, addToast, setActiveSidebarTab } = useApp();
  const { path } = useRouter();

  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'cat_vehicles');

  // Determine if we are on /new or /edit/:id
  const isAddRoute = path === '/admin/marketplace/attributes/new';
  const editMatch = path.match(/^\/admin\/marketplace\/attributes\/edit\/([^/]+)$/);
  const editId = editMatch ? editMatch[1] : null;
  const editingField = editId ? customFields.find((f) => f.id === editId) || null : null;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'select' as CustomFieldDefinition['type'],
    optionsString: '',
    required: true,
    unit: '',
    filterable: true,
  });

  useEffect(() => {
    const field = editId ? customFields.find((f) => f.id === editId) : null;
    if (field) {
      setFormData({
        name: field.name,
        label: field.label,
        type: field.type,
        optionsString: field.options ? field.options.join(', ') : '',
        required: field.required,
        unit: field.unit || '',
        filterable: field.filterable,
      });
      setSelectedCatId(field.categoryId);
    } else if (isAddRoute) {
      setFormData({
        name: '',
        label: '',
        type: 'select',
        optionsString: '',
        required: true,
        unit: '',
        filterable: true,
      });
    }
  }, [editId, isAddRoute]);

  const activeCategory = categories.find((c) => c.id === selectedCatId);
  const activeFields = customFields.filter((f) => f.categoryId === selectedCatId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.label.trim()) return;

    const options =
      formData.type === 'select' || formData.type === 'radio'
        ? formData.optionsString
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (editingField) {
      updateCustomField({
        ...editingField,
        categoryId: selectedCatId,
        name: formData.name,
        label: formData.label,
        type: formData.type,
        options,
        required: formData.required,
        unit: formData.unit.trim() || undefined,
        filterable: formData.filterable,
      });
      addToast({
        title: 'Attribute Updated',
        message: `Dynamic attribute "${formData.label}" updated.`,
        type: 'success',
      });
    } else {
      addCustomField({
        categoryId: selectedCatId,
        name: formData.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label: formData.label,
        type: formData.type,
        options,
        required: formData.required,
        unit: formData.unit.trim() || undefined,
        filterable: formData.filterable,
      });
      addToast({
        title: 'Attribute Created',
        message: `Dynamic attribute "${formData.label}" created.`,
        type: 'success',
      });
    }
    navigateTo('/admin/marketplace/attributes');
  };

  // If on /new or /edit/:id, render dedicated form webpage!
  if (isAddRoute || editId) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto text-slate-900 dark:text-white animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <button
                onClick={() => navigateTo('/admin/marketplace/attributes')}
                className="hover:text-blue-600 flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Custom Attributes
              </button>
              <span>/</span>
              <span>{editingField ? 'Edit Dynamic Attribute' : 'New Dynamic Attribute'}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              {editingField ? `Edit Attribute: ${editingField.label}` : 'Add Dynamic Attribute (EAV System)'}
            </h1>
          </div>
          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg">
            URL: {path}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Target Category *
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {categories.map((cat) => {
                  const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
                  return (
                    <option key={cat.id} value={cat.id}>
                      {parent ? `${parent.name} → ${cat.name}` : `📂 ${cat.name}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Display Label (Human Readable) *
              </label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    label: val,
                    name: prev.name || val.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                  }));
                }}
                placeholder="e.g. Kilometers Driven, Fuel Type, BHK"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Attribute Key (Database Column / Slug) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. km_driven"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Field Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as CustomFieldDefinition['type'],
                    })
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="select">Dropdown (Select)</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="number">Number</option>
                  <option value="text">Text Input</option>
                  <option value="checkbox">Checkbox (Yes/No)</option>
                </select>
              </div>
            </div>

            {(formData.type === 'select' || formData.type === 'radio') && (
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Options (comma separated list) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.optionsString}
                  onChange={(e) => setFormData({ ...formData, optionsString: e.target.value })}
                  placeholder="e.g. Petrol, Diesel, CNG, Electric"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Measurement Unit (Optional)
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. km, Year, sq.ft, GB"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Required in Post-Ad</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.filterable}
                  onChange={(e) => setFormData({ ...formData, filterable: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Enable in Search Filter</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigateTo('/admin/marketplace/attributes')}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
              >
                {editingField ? 'Update Attribute' : 'Add Attribute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => {
              setActiveSidebarTab('dashboard');
              navigateTo('/admin/dashboard');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h2 className="text-xl font-bold tracking-tight">Dynamic Attributes & Custom Fields Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dynamic ad specifications per category (e.g. KM Driven, BHK, Fuel, Battery Health)
          </p>
        </div>

        <button
          onClick={() => navigateTo('/admin/marketplace/attributes/new')}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Custom Field
        </button>
      </div>

      {/* Category Selector Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Select Target Category
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCatId === cat.id
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {parent ? `${parent.name} → ${cat.name}` : cat.name} ({customFields.filter((f) => f.categoryId === cat.id).length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Attributes Grid + Live Form Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configured Fields Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight">
              Fields configured for &quot;{activeCategory?.name}&quot;
            </h3>
            <span className="text-xs text-slate-400">
              {activeFields.length} active fields
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3">Field Label</th>
                  <th className="p-3">Slug Key</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Validation</th>
                  <th className="p-3">Filterable</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeFields.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No custom attributes configured for this category yet.
                    </td>
                  </tr>
                ) : (
                  activeFields.map((field) => (
                    <tr key={field.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {field.label}
                        {field.unit && (
                          <span className="text-slate-400 ml-1 font-normal text-[11px]">
                            ({field.unit})
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{field.name}</td>
                      <td className="p-3">
                        <Badge variant="purple" size="sm">
                          {field.type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => {
                            updateCustomField({ ...field, required: !field.required });
                            addToast({
                              type: 'info',
                              title: field.required ? 'Field Optional' : 'Field Required',
                              message: `Attribute "${field.label}" requirement updated.`,
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                            field.required
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                          title="Click to toggle Required status ON/OFF"
                        >
                          {field.required ? 'Required *' : 'Optional'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => {
                            updateCustomField({ ...field, filterable: !field.filterable });
                            addToast({
                              type: 'info',
                              title: field.filterable ? 'Filter Disabled' : 'Filter Enabled',
                              message: `Attribute "${field.label}" search filter status updated.`,
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                            field.filterable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                          title="Click to toggle Search Filter status ON/OFF"
                        >
                          {field.filterable ? 'Filter ON' : 'Filter OFF'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigateTo(`/admin/marketplace/attributes/edit/${field.id}`)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Edit Dynamic Attribute"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCustomField(field.id)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-600"
                            title="Delete Attribute"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Form Preview Simulator */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold tracking-tight">Seller Post-Ad Preview</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            How these dynamic fields render in the Chillyads listing wizard:
          </p>

          <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {activeFields.length === 0 ? (
              <div className="text-center text-slate-400 py-6">
                Add attributes to preview dynamic seller inputs
              </div>
            ) : (
              activeFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                    {field.unit && <span className="text-slate-400 ml-1">({field.unit})</span>}
                  </label>

                  {field.type === 'select' && (
                    <select className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300">
                      <option value="">Select {field.label}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'radio' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {field.options?.map((opt) => (
                        <span
                          key={opt}
                          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-medium"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                    />
                  )}

                  {field.type === 'text' && (
                    <input
                      type="text"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
