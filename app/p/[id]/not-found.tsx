export default function PasteNotFound() {
  return (
    <div>
      <h2>Paste not available</h2>
      <p className="error">
        This paste is missing, expired, or has exceeded its view limit.
      </p>
    </div>
  );
}
