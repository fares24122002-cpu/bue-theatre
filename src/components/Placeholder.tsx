type PlaceholderProps = {
  title: string;
  /** What this screen will do once built. */
  description: string;
  /** Name of the approved design screen to build from. */
  design: string;
};

/**
 * Stand-in for a screen that is designed but not built yet.
 * Each page that uses this is replaced during the build phase.
 */
export function Placeholder({ title, description, design }: PlaceholderProps) {
  return (
    <div className="container">
      <div className="placeholder">
        <span className="tag">NOT BUILT YET</span>
        <h1 className="display">{title}</h1>
        <p className="note">
          {description}
          <br />
          <br />
          Design to follow: <strong>{design}</strong>
        </p>
      </div>
    </div>
  );
}
