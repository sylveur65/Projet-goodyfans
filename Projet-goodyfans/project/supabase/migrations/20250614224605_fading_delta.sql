/*
  # Create moderation view for better performance

  1. New Views
    - `moderation_with_content` - Joins content_moderation with content data
  
  2. Security
    - Add appropriate permissions for the view
  
  3. Indexes
    - Add performance indexes for moderation queries
*/

-- Create a view that properly joins moderation data with content
CREATE OR REPLACE VIEW moderation_with_content AS
SELECT 
  cm.*,
  CASE 
    WHEN cm.content_type IN ('image', 'video', 'media') THEN
      json_build_object(
        'type', 'media',
        'id', mf.id,
        'filename', mf.filename,
        'mime_type', mf.mime_type,
        'cloudflare_url', mf.cloudflare_url,
        'creator_name', p_media.full_name
      )
    WHEN cm.content_type IN ('text', 'url') THEN
      json_build_object(
        'type', 'content',
        'id', pc.id,
        'title', pc.title,
        'description', pc.description,
        'content_type', pc.content_type,
        'creator_name', p_content.full_name
      )
    ELSE NULL
  END as content_data
FROM content_moderation cm
LEFT JOIN mediafile mf ON cm.content_id = mf.id AND cm.content_type IN ('image', 'video', 'media')
LEFT JOIN profile p_media ON mf.creator_id = p_media.id
LEFT JOIN ppvcontent pc ON cm.content_id = pc.id AND cm.content_type IN ('text', 'url')
LEFT JOIN profile p_content ON pc.creator_id = p_content.id;

-- Grant access to the view
GRANT SELECT ON moderation_with_content TO authenticated;
GRANT SELECT ON moderation_with_content TO anon;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_moderation_content_id_type 
  ON content_moderation (content_id, content_type);

CREATE INDEX IF NOT EXISTS idx_content_moderation_status_created 
  ON content_moderation (status, created_at);

-- Add function to improve studio detection
CREATE OR REPLACE FUNCTION improve_studio_detection() RETURNS trigger AS $$
DECLARE
  studio_keywords TEXT[] := ARRAY['studio', 'music', 'audio', 'recording', 'producer', 'daw', 'mixing', 'sound', 
                                 'monitor', 'speaker', 'headphone', 'microphone', 'keyboard', 'piano', 'guitar', 
                                 'instrument', 'musician', 'artist', 'beat', 'track', 'song'];
  content_text TEXT;
  keyword TEXT;
  is_studio BOOLEAN := FALSE;
BEGIN
  -- Get content to analyze
  IF NEW.content_type = 'media' THEN
    SELECT cloudflare_url INTO content_text FROM mediafile WHERE id = NEW.content_id;
  ELSE
    SELECT title || ' ' || COALESCE(description, '') INTO content_text FROM ppvcontent WHERE id = NEW.content_id;
  END IF;
  
  -- Check for studio keywords
  IF content_text IS NOT NULL THEN
    content_text := LOWER(content_text);
    
    FOREACH keyword IN ARRAY studio_keywords LOOP
      IF content_text LIKE '%' || keyword || '%' THEN
        is_studio := TRUE;
        EXIT;
      END IF;
    END LOOP;
    
    -- Add studio_context flag if detected
    IF is_studio AND NEW.auto_result IS NOT NULL THEN
      IF NEW.auto_result->'flags' IS NULL OR jsonb_array_length(NEW.auto_result->'flags') = 0 THEN
        NEW.auto_result := jsonb_set(NEW.auto_result, '{flags}', '["studio_context"]'::jsonb);
      ELSE
        -- Check if flag already exists
        IF NOT (NEW.auto_result->'flags' ? 'studio_context') THEN
          NEW.auto_result := jsonb_set(
            NEW.auto_result, 
            '{flags}', 
            NEW.auto_result->'flags' || '"studio_context"'::jsonb
          );
        END IF;
      END IF;
      
      -- Reduce violence score for studio content
      IF NEW.auto_result->'categories'->'violence' IS NOT NULL THEN
        NEW.auto_result := jsonb_set(
          NEW.auto_result,
          '{categories, violence}',
          to_jsonb(GREATEST(0.01, (NEW.auto_result->'categories'->>'violence')::float * 0.1))
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for studio detection
DROP TRIGGER IF EXISTS improve_studio_detection_trigger ON content_moderation;
CREATE TRIGGER improve_studio_detection_trigger
BEFORE INSERT OR UPDATE ON content_moderation
FOR EACH ROW
EXECUTE FUNCTION improve_studio_detection();

-- Function to normalize moderation flags
CREATE OR REPLACE FUNCTION normalize_moderation_flags() RETURNS trigger AS $$
DECLARE
  flags jsonb;
  unique_flags jsonb := '[]'::jsonb;
  flag text;
BEGIN
  -- Skip if no auto_result or flags
  IF NEW.auto_result IS NULL OR NEW.auto_result->'flags' IS NULL THEN
    RETURN NEW;
  END IF;
  
  flags := NEW.auto_result->'flags';
  
  -- Process each flag
  FOR i IN 0..jsonb_array_length(flags) - 1 LOOP
    flag := flags->>i;
    
    -- Normalize flag names
    IF flag = 'studio_context_detected' THEN
      flag := 'studio_context';
    ELSIF flag = 'workspace_context' THEN
      flag := 'workspace';
    END IF;
    
    -- Add to unique flags if not already present
    IF NOT (unique_flags ? flag) THEN
      unique_flags := unique_flags || to_jsonb(flag);
    END IF;
  END LOOP;
  
  -- Update auto_result with normalized flags
  NEW.auto_result := jsonb_set(NEW.auto_result, '{flags}', unique_flags);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for flag normalization
DROP TRIGGER IF EXISTS normalize_moderation_flags_trigger ON content_moderation;
CREATE TRIGGER normalize_moderation_flags_trigger
BEFORE INSERT OR UPDATE ON content_moderation
FOR EACH ROW
EXECUTE FUNCTION normalize_moderation_flags();

-- Function to update content_moderation updated_at
CREATE OR REPLACE FUNCTION update_content_moderation_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_content_moderation_updated_at ON content_moderation;
CREATE TRIGGER update_content_moderation_updated_at
BEFORE UPDATE ON content_moderation
FOR EACH ROW
EXECUTE FUNCTION update_content_moderation_updated_at();