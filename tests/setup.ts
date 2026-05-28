// Loaded before each test file. Ensures .env is parsed for the test process
// and silences the HTTP request logger so jest output stays readable.
import 'dotenv/config';

process.env.LOG_LEVEL ??= 'silent';
