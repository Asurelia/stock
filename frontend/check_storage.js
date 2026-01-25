
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Credentials from .env.local
const supabaseUrl = 'https://jbbiarxtqevifepzzwgu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiYmlhcnh0cWV2aWZlcHp6d2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzIxNzAsImV4cCI6MjA4NDI0ODE3MH0.HG1fgglrhL8WczG2eTnLv-d3wDQH0IM8zMiYkWBK8qM';

const supabase = createClient(supabaseUrl, supabaseKey);

function log(msg) {
    console.log(msg);
    try {
        fs.appendFileSync('check_output.txt', msg + '\n');
    } catch (e) {
        console.error('Log error:', e);
    }
}

async function check() {
    try {
        fs.writeFileSync('check_output.txt', ''); // clear file
    } catch (e) {
        console.error('File init error:', e);
    }

    log('--- DIAGNOSTIC START ---');

    // 1. Check Bucket (traceability-photos)
    log('Checking bucket "traceability-photos"...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
        log('Error listing buckets: ' + JSON.stringify(bucketError));
    } else {
        log('Available buckets: ' + buckets.map(b => `${b.id} (public: ${b.public})`).join(', '));

        const bucket = buckets.find(b => b.id === 'traceability-photos');
        if (!bucket) {
            log('❌ Bucket "traceability-photos" NOT FOUND!');
        } else {
            log('✅ Bucket "traceability-photos" FOUND.');
            log('Public: ' + bucket.public);
        }
    }

    // 2. Try URL Generation
    log('\nChecking URL generation...');
    const path = 'test-check/image.jpg';
    const { data: urlData } = supabase.storage
        .from('traceability-photos')
        .getPublicUrl(path);

    log('Generated Public URL for "' + path + '":');
    log(urlData.publicUrl);

    // 3. Check Table Data
    log('\nChecking "traceability_photos" table data...');
    const { data: photos, error: tableError } = await supabase
        .from('traceability_photos')
        .select('id, output_id, storage_path, url, created_at')
        .limit(5)
        .order('created_at', { ascending: false });

    if (tableError) {
        log('❌ Error querying table: ' + JSON.stringify(tableError));
    } else {
        if (photos.length > 0) {
            const latestPhoto = photos[0];
            log('\nTesting access to latest photo:');
            log('URL: ' + latestPhoto.url);

            try {
                const res = await fetch(latestPhoto.url);
                log('Fetch Status: ' + res.status + ' ' + res.statusText);
                log('Content-Type: ' + res.headers.get('content-type'));
                log('Content-Length: ' + res.headers.get('content-length'));

                if (res.ok) {
                    const blob = await res.blob();
                    log('Downloaded Blob Size: ' + blob.size + ' bytes');

                    if (blob.size < 100) {
                        log('⚠️ WARNING: File is extremely small, possibly empty or corrupt.');
                    } else {
                        log('✅ File seems valid.');
                    }
                } else {
                    log('❌ FAILED to download file. This indicates an issue with Storage RLS or Bucket config.');
                }
            } catch (e) {
                log('❌ Fetch Error: ' + e.message);
            }
        }
    }

    log('--- DIAGNOSTIC END ---');
}

check();
