export const sidebarStyles = {
  container: {
    backgroundColor: '#0d1117',
    height: '100vh',
    position: 'fixed' as const,
    left: 0,
    top: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid #21262d',
  },
  title: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  nav: {
    flex: 1,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
}

export const sidebarItemStyles = {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    color: '#d1d5db',
    textDecoration: 'none',
    transition: 'all 0.2s',
    borderRadius: '8px',
  },
  hover: {
    backgroundColor: '#161b22',
  },
  active: {
    backgroundColor: '#161b22',
    fontWeight: '500',
  },
}
