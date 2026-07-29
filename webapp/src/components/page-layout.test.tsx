// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageLayout, PageScrollArea } from './page-layout';

afterEach(cleanup);

describe('page layout', () => {
  it('keeps the route fixed and delegates overflow to its content region', () => {
    render(
      <PageLayout>
        <div>Header</div>
        <PageScrollArea>Content</PageScrollArea>
      </PageLayout>,
    );

    expect(screen.getByTestId('page-layout').className).toContain(
      'flex h-full min-h-0 w-full flex-col',
    );
    expect(screen.getByTestId('page-scroll-area').className).toContain(
      'min-h-0 flex-1 overflow-y-auto',
    );
  });
});
