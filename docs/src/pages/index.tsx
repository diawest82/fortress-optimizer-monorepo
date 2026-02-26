import React, { useEffect } from 'react';
import { useHistory } from '@docusaurus/router';
import styles from './styles.module.css';

export default function Home(): JSX.Element {
  const history = useHistory();

  useEffect(() => {
    // Redirect to docs home page
    history.push('/docs/getting-started');
  }, [history]);

  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1>Fortress Documentation</h1>
          <p>Redirecting to documentation...</p>
        </div>
      </section>
    </main>
  );
}
