// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JobDescriptionEditor } from './job-description-editor';
import { BasicA4Resume } from './basic-a4-resume';

describe('Tailor workspace UI', () => {
  it('uses a document-sized editor and reports content changes', () => {
    const onChange = vi.fn();
    render(<JobDescriptionEditor value="Original description" onChange={onChange} />);

    const editor = screen.getByRole('textbox', { name: /job description/i });
    expect(editor.classList.contains('tailor-document-editor')).toBe(true);
    fireEvent.change(editor, { target: { value: 'Updated job description' } });
    expect(onChange).toHaveBeenCalledWith('Updated job description');
  });

  it('renders canonical resume nodes on an A4 page', () => {
    render(
      <BasicA4Resume
        resume={{
          name: 'Amit Agrawal',
          email: 'amit@example.com',
          contact: {},
          template_id: 'basic-a4-v1',
          page_size: 'A4',
          sections: [{ id: 'summary', title: 'Professional Summary', items: [
            { id: 'fact-1', label: 'Summary', value: 'Frontend architect', source_fact_ids: ['1'] },
          ] }],
        }}
        focusedFactIds={new Set(['1'])}
        showChanges
      />,
    );

    expect(screen.getByText('Frontend architect').getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByLabelText(/a4 resume preview/i)).toBeTruthy();
  });
});
