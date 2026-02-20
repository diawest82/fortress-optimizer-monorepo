import React from 'react';
import styles from './styles.module.css';

export default function Home(): JSX.Element {
  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1>Fortress Documentation</h1>
          <p>Save 30-50% on LLM API costs with intelligent token optimization</p>
        </div>
      </section>
    </main>
  );
}
