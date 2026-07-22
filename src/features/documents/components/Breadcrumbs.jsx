import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            to="/documents"
            className="inline-flex items-center text-sm font-medium text-surface-on-variant hover:text-primary transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Documents
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-surface-on-variant mx-1" />
              {item.path ? (
                <Link
                  to={item.path}
                  className="ms-1 text-sm font-medium text-surface-on-variant hover:text-primary transition-colors md:ms-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="ms-1 text-sm font-medium text-surface-on md:ms-2">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
